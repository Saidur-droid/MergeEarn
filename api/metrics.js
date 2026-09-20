import { handleError, json, method, nimiqRpc, requireEnv, supabase } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const url = new URL(req.url, 'http://localhost');
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

    const [bounties, payments, claims] = await Promise.all([
      supabase('bounties', { query: { select: 'id,status,reward_amount_luna,created_at,updated_at' } }),
      supabase('payment_transactions', { query: { select: 'bounty_id,type,status,amount_luna,created_at,updated_at' } }),
      supabase('claims', { query: { select: 'bounty_id,contributor_user_id,status,created_at,updated_at' } }),
    ]);

    const count = (status) => bounties.filter((item) => item.status === status).length;
    const confirmedFunding = payments.filter((item) => item.type === 'FUNDING' && item.status === 'CONFIRMED');
    const confirmedPayouts = payments.filter((item) => item.type === 'PAYOUT' && item.status === 'CONFIRMED');
    const paidBountyIds = new Set(confirmedPayouts.map((item) => item.bounty_id));
    const contributors = new Map();
    for (const claim of claims) contributors.set(claim.contributor_user_id, (contributors.get(claim.contributor_user_id) || 0) + 1);

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
        repeatContributors: [...contributors.values()].filter((value) => value > 1).length,
        medianCompletionMs: medianMs,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
}
