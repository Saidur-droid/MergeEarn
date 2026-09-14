import { getBounty, handleError, json, method, readJson, requireEnv, requireSession, supabase, transitionBounty, verifyNimiqTransaction } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const session = await requireSession(req);
    const body = await readJson(req);
    const bounty = await getBounty(body.bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });
    if (bounty.creator_user_id !== session.user.id) {
      const error = new Error('Only the bounty creator can record funding.');
      error.statusCode = 403;
      throw error;
    }
    const idempotencyKey = `funding:${bounty.id}`;
    const recipient = requireEnv('NIMIQ_FUNDING_ADDRESS');

    if (body.action === 'submit') {
      if (bounty.status !== 'READY_TO_FUND') {
        const error = new Error('Bounty is not waiting for funding.');
        error.statusCode = 409;
        throw error;
      }
      const txHash = String(body.txHash || '').trim();
      if (!txHash) {
        const error = new Error('Nimiq transaction hash is required.');
        error.statusCode = 400;
        throw error;
      }
      const [existing] = await supabase('payment_transactions', { query: { idempotency_key: `eq.${idempotencyKey}`, limit: 1 } });
      if (existing?.status === 'CONFIRMED') return json(res, 200, { transaction: existing, alreadyConfirmed: true });
      if (existing?.status === 'PENDING' && existing.provider_reference && existing.provider_reference !== txHash) {
        const error = new Error('A different funding transaction is already pending for this bounty.');
        error.statusCode = 409;
        throw error;
      }

      let rows;
      if (existing) {
        rows = await supabase('payment_transactions', {
          method: 'PATCH',
          query: { id: `eq.${existing.id}` },
          prefer: 'return=representation',
          body: {
            provider_reference: txHash,
            status: 'PENDING',
            error_message: null,
            metadata: { recipient, submittedBy: session.user.id, retry: existing.status === 'FAILED' },
            updated_at: new Date().toISOString(),
          },
        });
      } else {
        rows = await supabase('payment_transactions', {
          method: 'POST',
          prefer: 'return=representation',
          body: {
            bounty_id: bounty.id,
            type: 'FUNDING',
            provider: 'NIMIQ',
            asset: 'NIM',
            amount_luna: bounty.reward_amount_luna,
            provider_reference: txHash,
            idempotency_key: idempotencyKey,
            status: 'PENDING',
            metadata: { recipient, submittedBy: session.user.id },
          },
        });
      }
      await supabase('audit_events', { method: 'POST', body: { bounty_id: bounty.id, actor_type: 'USER', actor_id: session.user.id, event_type: 'funding.submitted', metadata: { txHash } } });
      return json(res, 200, { transaction: rows[0] });
    }

    if (body.action === 'verify') {
      const [transaction] = await supabase('payment_transactions', { query: { idempotency_key: `eq.${idempotencyKey}`, limit: 1 } });
      if (!transaction?.provider_reference) {
        const error = new Error('No funding transaction has been submitted.');
        error.statusCode = 409;
        throw error;
      }
      if (transaction.status === 'CONFIRMED' && bounty.status === 'FUNDED') return json(res, 200, { confirmed: true, transaction });
      const verification = await verifyNimiqTransaction({
        hash: transaction.provider_reference,
        expectedRecipient: recipient,
        expectedAmountLuna: bounty.reward_amount_luna,
      });
      if (verification.rejected) {
        await supabase('payment_transactions', { method: 'PATCH', query: { id: `eq.${transaction.id}` }, body: { status: 'FAILED', error_message: verification.reason, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
        return json(res, 400, { confirmed: false, error: verification.reason });
      }
      if (!verification.confirmed) return json(res, 202, { confirmed: false, pending: true, message: verification.reason });

      const updated = await supabase('payment_transactions', { method: 'PATCH', query: { id: `eq.${transaction.id}` }, body: { status: 'CONFIRMED', error_message: null, metadata: { ...transaction.metadata, verifiedAt: new Date().toISOString() }, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
      if (bounty.status === 'READY_TO_FUND') {
        await transitionBounty({ bountyId: bounty.id, from: 'READY_TO_FUND', to: 'FUNDED', actorType: 'SYSTEM', actorId: 'nimiq', eventType: 'bounty.funded', metadata: { txHash: transaction.provider_reference } });
      }
      return json(res, 200, { confirmed: true, transaction: updated[0] });
    }

    const error = new Error('Unknown funding action.');
    error.statusCode = 400;
    throw error;
  } catch (error) {
    handleError(res, error);
  }
}
