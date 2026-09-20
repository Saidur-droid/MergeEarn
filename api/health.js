import { handleError, json, method, nimiqRpc, requireEnv, supabase } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const [rows, blockNumber] = await Promise.all([
      supabase('bounties', { query: { select: 'id', limit: 1 } }),
      nimiqRpc('getBlockNumber'),
    ]);
    json(res, 200, {
      ok: true,
      database: Array.isArray(rows),
      nimiqRpc: Number.isFinite(Number(blockNumber)),
      blockNumber: Number(blockNumber),
      fundingConfigured: Boolean(requireEnv('NIMIQ_FUNDING_ADDRESS')),
      checkedAt: new Date().toISOString(),
    }, { 'cache-control': 'no-store' });
  } catch (error) {
    handleError(res, error);
  }
}
