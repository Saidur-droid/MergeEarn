import { assertRepoMaintainer, getBounty, handleError, json, lunaToNim, method, readJson, requireEnv, requireSession, supabase, transitionBounty, verifyNimiqTransaction } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const session = await requireSession(req);
    const body = await readJson(req);
    const bounty = await getBounty(body.bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });
    const repo = bounty.github_repositories;
    await assertRepoMaintainer(session.githubToken, repo.owner, repo.name);

    const claim = (bounty.claims || []).find((item) => item.status === 'ACTIVE') || (bounty.claims || [])[0];
    if (!claim?.nimiq_address) {
      const error = new Error('No contributor payout address is recorded for this bounty.');
      error.statusCode = 409;
      throw error;
    }
    const sourceAddress = requireEnv('NIMIQ_PAYOUT_SOURCE_ADDRESS');
    const idempotencyKey = `payout:${bounty.id}`;
    let [existing] = await supabase('payment_transactions', { query: { idempotency_key: `eq.${idempotencyKey}`, limit: 1 } });

    if (body.action === 'prepare') {
      if (existing?.status === 'CONFIRMED') return json(res, 200, { alreadyPaid: true, transaction: existing });
      if (!['APPROVED', 'PAYMENT_FAILED'].includes(bounty.status)) {
        const error = new Error('Bounty must be approved before payout can start.');
        error.statusCode = 409;
        throw error;
      }

      if (existing?.status === 'FAILED') {
        const rows = await supabase('payment_transactions', {
          method: 'PATCH',
          query: { id: `eq.${existing.id}` },
          prefer: 'return=representation',
          body: {
            provider_reference: null,
            status: 'PENDING',
            error_message: null,
            metadata: { recipient: claim.nimiq_address, sourceAddress, preparedBy: session.user.id, retry: true },
            updated_at: new Date().toISOString(),
          },
        });
        existing = rows[0];
      }

      if (existing?.provider_reference) {
        return json(res, 200, { transaction: existing, payout: { recipient: claim.nimiq_address, amountNim: lunaToNim(bounty.reward_amount_luna), sourceAddress } });
      }

      let transaction = existing;
      if (!transaction) {
        const rows = await supabase('payment_transactions', {
          method: 'POST',
          prefer: 'return=representation',
          body: {
            bounty_id: bounty.id,
            type: 'PAYOUT',
            provider: 'NIMIQ',
            asset: 'NIM',
            amount_luna: bounty.reward_amount_luna,
            idempotency_key: idempotencyKey,
            status: 'PENDING',
            metadata: { recipient: claim.nimiq_address, sourceAddress, preparedBy: session.user.id },
          },
        });
        transaction = rows[0];
        await supabase('audit_events', { method: 'POST', body: { bounty_id: bounty.id, actor_type: 'USER', actor_id: session.user.id, event_type: 'payout.started', metadata: { transactionId: transaction.id } } });
      }

      return json(res, 200, { transaction, payout: { recipient: claim.nimiq_address, amountNim: lunaToNim(bounty.reward_amount_luna), sourceAddress } });
    }

    if (body.action === 'submit') {
      if (!existing) {
        const error = new Error('Prepare payout before submitting a transaction.');
        error.statusCode = 409;
        throw error;
      }
      if (existing.status === 'CONFIRMED') return json(res, 200, { alreadyPaid: true, transaction: existing });
      const txHash = String(body.txHash || '').trim();
      if (!txHash) {
        const error = new Error('Nimiq payout transaction hash is required.');
        error.statusCode = 400;
        throw error;
      }
      if (existing.status === 'PENDING' && existing.provider_reference && existing.provider_reference !== txHash) {
        const error = new Error('A different payout transaction is already pending; verify it before retrying.');
        error.statusCode = 409;
        throw error;
      }
      const rows = await supabase('payment_transactions', {
        method: 'PATCH',
        query: { id: `eq.${existing.id}` },
        prefer: 'return=representation',
        body: { provider_reference: txHash, status: 'PENDING', error_message: null, updated_at: new Date().toISOString() },
      });
      await supabase('audit_events', { method: 'POST', body: { bounty_id: bounty.id, actor_type: 'USER', actor_id: session.user.id, event_type: 'payout.submitted', metadata: { txHash } } });
      return json(res, 200, { transaction: rows[0] });
    }

    if (body.action === 'verify') {
      if (!existing?.provider_reference) {
        const error = new Error('No payout transaction has been submitted.');
        error.statusCode = 409;
        throw error;
      }
      if (existing.status === 'CONFIRMED' && bounty.status === 'PAID') return json(res, 200, { confirmed: true, transaction: existing });
      const verification = await verifyNimiqTransaction({
        hash: existing.provider_reference,
        expectedRecipient: claim.nimiq_address,
        expectedAmountLuna: bounty.reward_amount_luna,
        expectedSender: sourceAddress,
      });
      if (verification.rejected) {
        await supabase('payment_transactions', { method: 'PATCH', query: { id: `eq.${existing.id}` }, body: { status: 'FAILED', error_message: verification.reason, updated_at: new Date().toISOString() } });
        if (bounty.status === 'APPROVED') {
          await transitionBounty({ bountyId: bounty.id, from: 'APPROVED', to: 'PAYMENT_FAILED', actorType: 'SYSTEM', actorId: 'nimiq', eventType: 'payout.failed', metadata: { reason: verification.reason } });
        }
        return json(res, 400, { confirmed: false, error: verification.reason });
      }
      if (!verification.confirmed) return json(res, 202, { confirmed: false, pending: true, message: verification.reason });

      const rows = await supabase('payment_transactions', {
        method: 'PATCH',
        query: { id: `eq.${existing.id}` },
        prefer: 'return=representation',
        body: { status: 'CONFIRMED', error_message: null, metadata: { ...existing.metadata, verifiedAt: new Date().toISOString() }, updated_at: new Date().toISOString() },
      });
      const current = await getBounty(bounty.id);
      if (current.status === 'PAYMENT_FAILED') {
        await transitionBounty({ bountyId: bounty.id, from: 'PAYMENT_FAILED', to: 'APPROVED', actorType: 'SYSTEM', actorId: 'nimiq', eventType: 'payout.retry_verified', metadata: {} });
      }
      const afterRetry = await getBounty(bounty.id);
      if (afterRetry.status === 'APPROVED') {
        await transitionBounty({ bountyId: bounty.id, from: 'APPROVED', to: 'PAID', actorType: 'SYSTEM', actorId: 'nimiq', eventType: 'payout.confirmed', metadata: { txHash: existing.provider_reference } });
      }
      await supabase('claims', { method: 'PATCH', query: { id: `eq.${claim.id}` }, body: { status: 'COMPLETED', updated_at: new Date().toISOString() } });
      return json(res, 200, { confirmed: true, transaction: rows[0] });
    }

    const error = new Error('Unknown payout action.');
    error.statusCode = 400;
    throw error;
  } catch (error) {
    handleError(res, error);
  }
}
