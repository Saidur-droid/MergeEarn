import { handleError, json, method, nimiqRpc, readJson, requireEnv, requireSession, supabase } from './_lib/server.js';

const JOIN_EVENT = 'community.contributor_joined';

function normalizeAddress(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function validNimiqAddress(value) {
  const compact = value.replace(/\s+/g, '');
  return compact.startsWith('NQ') && compact.length >= 30 && compact.length <= 44;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (url.searchParams.get('action') === 'community') {
      if (!method(req, res, ['GET', 'POST'])) return;

      const session = await requireSession(req);
      const existing = await supabase('audit_events', {
        query: {
          select: 'id,created_at,metadata',
          actor_type: 'eq.USER',
          actor_id: `eq.${session.user.id}`,
          event_type: `eq.${JOIN_EVENT}`,
          order: 'created_at.asc',
          limit: 1,
        },
      });

      if (req.method === 'GET') {
        return json(res, 200, {
          joined: Boolean(existing?.[0]),
          joinedAt: existing?.[0]?.created_at || null,
        }, { 'cache-control': 'private, no-store' });
      }

      if (existing?.[0]) {
        return json(res, 200, {
          joined: true,
          joinedAt: existing[0].created_at,
          alreadyJoined: true,
        });
      }

      const body = await readJson(req);
      const nimiqAddress = normalizeAddress(body.nimiqAddress);
      if (!validNimiqAddress(nimiqAddress)) {
        return json(res, 400, { error: 'Connect a valid Nimiq Pay account before joining.' });
      }

      const rows = await supabase('audit_events', {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          bounty_id: null,
          actor_type: 'USER',
          actor_id: session.user.id,
          event_type: JOIN_EVENT,
          metadata: {
            githubLogin: session.user.github_login,
            nimiqAddress,
            source: 'nimiq-pay-contributor-pool',
          },
        },
      });

      return json(res, 201, {
        joined: true,
        joinedAt: rows?.[0]?.created_at || new Date().toISOString(),
      });
    }

    if (!method(req, res, ['GET'])) return;

    if (url.searchParams.get('health') === '1') {
      const [rows, blockNumber] = await Promise.all([
        supabase('bounties', { query: { select: 'id', limit: 1 } }),
        nimiqRpc('getBlockNumber'),
      ]);
      return json(res, 200, {
        ok: true,
        database: Array.isArray(rows),
        nimiqRpc: Number.isFinite(Number(blockNumber)),
        blockNumber: Number(blockNumber),
        fundingConfigured: Boolean(requireEnv('NIMIQ_FUNDING_ADDRESS')),
        checkedAt: new Date().toISOString(),
      }, { 'cache-control': 'no-store' });
    }

    const [bounties, payments, claims, communityJoins] = await Promise.all([
      supabase('bounties', { query: { select: 'id,status,reward_amount_luna,created_at,updated_at' } }),
      supabase('payment_transactions', { query: { select: 'bounty_id,type,status,amount_luna,metadata,created_at,updated_at' } }),
      supabase('claims', { query: { select: 'bounty_id,contributor_user_id,nimiq_address,status,created_at,updated_at' } }),
      supabase('audit_events', { query: { select: 'actor_id,event_type', event_type: 'eq.community.contributor_joined' } }),
    ]);

    const count = (status) => bounties.filter((item) => item.status === status).length;
    const confirmedFunding = payments.filter((item) => item.type === 'FUNDING' && item.status === 'CONFIRMED');
    const confirmedPayouts = payments.filter((item) => item.type === 'PAYOUT' && item.status === 'CONFIRMED');
    const paidBountyIds = new Set(confirmedPayouts.map((item) => item.bounty_id));
    const contributors = new Map();
    const contributorPool = new Set((communityJoins || []).map((item) => item.actor_id).filter(Boolean));
    const verifiedWallets = new Set();
    const normalizeWallet = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();
    for (const claim of claims) {
      contributors.set(claim.contributor_user_id, (contributors.get(claim.contributor_user_id) || 0) + 1);
      const wallet = normalizeWallet(claim.nimiq_address);
      if (wallet) verifiedWallets.add(wallet);
    }
    for (const payment of confirmedFunding) {
      const wallet = normalizeWallet(payment.metadata?.verifiedSender);
      if (wallet) verifiedWallets.add(wallet);
    }

    const durations = bounties
      .filter((item) => paidBountyIds.has(item.id))
      .map((item) => new Date(item.updated_at).getTime() - new Date(item.created_at).getTime())
      .filter((value) => Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);
    const medianMs = durations.length
      ? durations.length % 2
        ? durations[(durations.length - 1) / 2]
        : (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2
      : null;

    json(res, 200, {
      publicConfig: {
        fundingAddress: requireEnv('NIMIQ_FUNDING_ADDRESS'),
      },
      metrics: {
        bountiesCreated: bounties.length,
        funded: confirmedFunding.length,
        claimed: bounties.filter((item) => ['CLAIMED','PR_SUBMITTED','VERIFIED','APPROVED','PAID','PAYMENT_FAILED'].includes(item.status)).length,
        prSubmitted: bounties.filter((item) => ['PR_SUBMITTED','VERIFIED','APPROVED','PAID','PAYMENT_FAILED'].includes(item.status)).length,
        verifiedMerged: bounties.filter((item) => ['VERIFIED','APPROVED','PAID','PAYMENT_FAILED'].includes(item.status)).length,
        paid: count('PAID'),
        completionRate: bounties.length ? count('PAID') / bounties.length : 0,
        totalBountyLuna: bounties.reduce((sum, item) => sum + Number(item.reward_amount_luna || 0), 0),
        totalPaidLuna: confirmedPayouts.reduce((sum, item) => sum + Number(item.amount_luna || 0), 0),
        activeContributors: contributors.size,
        contributorPool: contributorPool.size,
        verifiedWallets: verifiedWallets.size,
        repeatContributors: [...contributors.values()].filter((value) => value > 1).length,
        medianCompletionMs: medianMs,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
}
