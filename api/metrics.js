import { handleError, json, method, nimiqRpc, readJson, requireEnv, requireSession, supabase } from './_lib/server.js';

const JOIN_EVENT = 'community.contributor_joined';
const ACQUISITION_EVENT = 'acquisition.github_registered';

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
      const [existing, acquisitionEvents] = await Promise.all([
        supabase('audit_events', {
          query: {
            select: 'id,created_at,metadata',
            actor_type: 'eq.USER',
            actor_id: `eq.${session.user.id}`,
            event_type: `eq.${JOIN_EVENT}`,
            order: 'created_at.asc',
            limit: 1,
          },
        }),
        supabase('audit_events', {
          query: {
            select: 'metadata',
            actor_type: 'eq.USER',
            actor_id: `eq.${session.user.id}`,
            event_type: `eq.${ACQUISITION_EVENT}`,
            order: 'created_at.asc',
            limit: 1,
          },
        }),
      ]);
      const acquisitionSource = String(acquisitionEvents?.[0]?.metadata?.source || 'direct');

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
      if (nimiqAddress && !validNimiqAddress(nimiqAddress)) {
        return json(res, 400, { error: 'The optional Nimiq address is not valid.' });
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
            nimiqAddress: nimiqAddress || null,
            source: nimiqAddress ? 'github-plus-nimiq-contributor-pool' : 'github-contributor-pool',
            acquisitionSource,
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

    const [bounties, payments, claims, communityJoins, users, acquisitionEvents] = await Promise.all([
      supabase('bounties', { query: { select: 'id,status,reward_amount_luna,created_at,updated_at' } }),
      supabase('payment_transactions', { query: { select: 'bounty_id,type,status,amount_luna,metadata,created_at,updated_at' } }),
      supabase('claims', { query: { select: 'bounty_id,contributor_user_id,nimiq_address,status,created_at,updated_at' } }),
      supabase('audit_events', { query: { select: 'actor_id,event_type,metadata', event_type: 'eq.community.contributor_joined' } }),
      supabase('users', { query: { select: 'id,created_at' } }),
      supabase('audit_events', { query: { select: 'actor_id,event_type,metadata', event_type: 'eq.acquisition.github_registered' } }),
    ]);

    const count = (status) => bounties.filter((item) => item.status === status).length;
    const confirmedFunding = payments.filter((item) => item.type === 'FUNDING' && item.status === 'CONFIRMED');
    const confirmedPayouts = payments.filter((item) => item.type === 'PAYOUT' && item.status === 'CONFIRMED');
    const paidBountyIds = new Set(confirmedPayouts.map((item) => item.bounty_id));
    const contributors = new Map();
    const contributorPool = new Set((communityJoins || []).map((item) => item.actor_id).filter(Boolean));
    const verifiedWallets = new Set();
    const newUserCutoff = Date.now() - (48 * 60 * 60 * 1000);
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

    const registrationByUser = new Map();
    for (const event of acquisitionEvents || []) {
      if (!event.actor_id || registrationByUser.has(event.actor_id)) continue;
      registrationByUser.set(event.actor_id, String(event.metadata?.source || 'direct'));
    }
    const joinedByUser = new Map();
    for (const event of communityJoins || []) {
      if (!event.actor_id || joinedByUser.has(event.actor_id)) continue;
      joinedByUser.set(event.actor_id, String(event.metadata?.acquisitionSource || registrationByUser.get(event.actor_id) || 'direct'));
    }
    const acquisitionSourceNames = new Set([...registrationByUser.values(), ...joinedByUser.values()]);
    const acquisitionSources = [...acquisitionSourceNames].sort().map((source) => ({
      source,
      registeredUsers: [...registrationByUser.values()].filter((value) => value === source).length,
      contributorPool: [...joinedByUser.values()].filter((value) => value === source).length,
    }));

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
        registeredUsers: users.length,
        newUsers48h: users.filter((item) => new Date(item.created_at).getTime() >= newUserCutoff).length,
        availableFunded: count('FUNDED'),
        contributorPool: contributorPool.size,
        verifiedWallets: verifiedWallets.size,
        repeatContributors: [...contributors.values()].filter((value) => value > 1).length,
        medianCompletionMs: medianMs,
        acquisitionSources,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
}
