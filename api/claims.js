import { getBounty, handleError, json, method, readJson, requireSession, supabase, transitionBounty } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const session = await requireSession(req);
    const body = await readJson(req);
    const bounty = await getBounty(body.bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });
    if (bounty.status !== 'FUNDED') {
      const error = new Error('Only a funded bounty can be claimed.');
      error.statusCode = 409;
      throw error;
    }
    const nimiqAddress = String(body.nimiqAddress || '').trim();
    if (!nimiqAddress) {
      const error = new Error('A Nimiq payout address is required to claim this bounty.');
      error.statusCode = 400;
      throw error;
    }
    const existing = await supabase('claims', { query: { bounty_id: `eq.${bounty.id}`, status: 'eq.ACTIVE', limit: 1 } });
    if (existing[0]) {
      const error = new Error('This bounty is already claimed.');
      error.statusCode = 409;
      throw error;
    }
    const rows = await supabase('claims', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        bounty_id: bounty.id,
        contributor_user_id: session.user.id,
        nimiq_address: nimiqAddress,
        status: 'ACTIVE',
      },
    });
    await transitionBounty({
      bountyId: bounty.id,
      from: 'FUNDED',
      to: 'CLAIMED',
      actorType: 'USER',
      actorId: session.user.id,
      eventType: 'bounty.claimed',
      metadata: { claimId: rows[0].id },
    });
    json(res, 201, { claim: rows[0] });
  } catch (error) {
    handleError(res, error);
  }
}
