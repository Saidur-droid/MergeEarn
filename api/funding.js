import { getBounty, getSession, handleError, json, method, nimToLuna, readJson, requireEnv, supabase, transitionBounty, verifyNimiqTransaction } from './_lib/server.js';

const SPONSOR_REPOSITORY = 'Saidur-droid/MergeEarn';
const SPONSOR_ISSUES = new Map([
  [25, { rewardNim: '5' }],
  [26, { rewardNim: '5' }],
  [27, { rewardNim: '5' }],
  [28, { rewardNim: '5' }],
]);

function isApprovedSponsorBounty(bounty) {
  const issueNumber = Number(bounty?.source_issues?.issue_number);
  return bounty?.github_repositories?.full_name === SPONSOR_REPOSITORY && SPONSOR_ISSUES.has(issueNumber);
}

async function ensureSponsorBounty(issueNumber) {
  const config = SPONSOR_ISSUES.get(issueNumber);
  if (!config) {
    const error = new Error('This issue is not currently open for community sponsorship.');
    error.statusCode = 404;
    throw error;
  }

  const [repo] = await supabase('github_repositories', { query: { full_name: `eq.${SPONSOR_REPOSITORY}`, limit: 1 } });
  const [owner] = await supabase('users', { query: { github_login: 'eq.Saidur-droid', limit: 1 } });
  if (!repo || !owner) throw new Error('Community sponsorship is not configured yet.');

  const response = await fetch(`https://api.github.com/repos/${SPONSOR_REPOSITORY}/issues/${issueNumber}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'MergeEarn',
    },
  });
  const issue = await response.json();
  if (!response.ok || issue.pull_request || issue.state !== 'open') {
    const error = new Error('This sponsor opportunity is no longer open.');
    error.statusCode = 409;
    throw error;
  }

  const issueRows = await supabase('source_issues', {
    method: 'POST',
    query: { on_conflict: 'repository_id,github_issue_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      repository_id: repo.id,
      github_issue_id: issue.id,
      issue_number: issue.number,
      title: issue.title,
      body: issue.body || null,
      html_url: issue.html_url,
      state: issue.state,
      updated_at: new Date().toISOString(),
    },
  });
  const sourceIssue = issueRows[0];

  const existing = await supabase('bounties', {
    query: {
      select: 'id,status,source_issue_id,reward_amount_luna',
      source_issue_id: `eq.${sourceIssue.id}`,
      order: 'created_at.desc',
      limit: 1,
    },
  });
  if (existing?.[0] && !['CANCELLED','EXPIRED'].includes(existing[0].status)) {
    return getBounty(existing[0].id);
  }

  const created = await supabase('bounties', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      repository_id: repo.id,
      source_issue_id: sourceIssue.id,
      creator_user_id: owner.id,
      title: issue.title,
      description: String(issue.body || issue.title).slice(0, 5000),
      acceptance_criteria: [
        'Implement the issue scope without breaking existing behavior.',
        'Add or update relevant tests and keep CI green.',
        'Open a pull request against the default branch for GitHub verification.',
      ],
      reward_amount_luna: nimToLuna(config.rewardNim),
      reward_asset: 'NIM',
      status: 'READY_TO_FUND',
      ai_metadata: { source: 'community-sponsor', issueNumber },
    },
  });
  await supabase('audit_events', {
    method: 'POST',
    body: {
      bounty_id: created[0].id,
      actor_type: 'SYSTEM',
      actor_id: 'community-sponsor',
      event_type: 'bounty.ready_to_fund',
      metadata: { issueNumber, rewardNim: config.rewardNim },
    },
  });
  return getBounty(created[0].id);
}

async function recordFunding({ bounty, txHash, actorId }) {
  const idempotencyKey = `funding:${bounty.id}`;
  const recipient = requireEnv('NIMIQ_FUNDING_ADDRESS');
  if (bounty.status !== 'READY_TO_FUND') {
    const error = new Error('Bounty is not waiting for funding.');
    error.statusCode = 409;
    throw error;
  }
  if (!txHash) {
    const error = new Error('Nimiq transaction hash is required.');
    error.statusCode = 400;
    throw error;
  }

  const [existing] = await supabase('payment_transactions', { query: { idempotency_key: `eq.${idempotencyKey}`, limit: 1 } });
  if (existing?.status === 'CONFIRMED') return { transaction: existing, alreadyConfirmed: true };
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
        metadata: { recipient, submittedBy: actorId, retry: existing.status === 'FAILED' },
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
        metadata: { recipient, submittedBy: actorId },
      },
    });
  }
  await supabase('audit_events', {
    method: 'POST',
    body: { bounty_id: bounty.id, actor_type: 'USER', actor_id: actorId, event_type: 'funding.submitted', metadata: { txHash } },
  });
  return { transaction: rows[0] };
}

async function verifyFunding(bounty) {
  const idempotencyKey = `funding:${bounty.id}`;
  const recipient = requireEnv('NIMIQ_FUNDING_ADDRESS');
  const [transaction] = await supabase('payment_transactions', { query: { idempotency_key: `eq.${idempotencyKey}`, limit: 1 } });
  if (!transaction?.provider_reference) {
    const error = new Error('No funding transaction has been submitted.');
    error.statusCode = 409;
    throw error;
  }
  if (transaction.status === 'CONFIRMED' && bounty.status === 'FUNDED') return { confirmed: true, transaction };

  const verification = await verifyNimiqTransaction({
    hash: transaction.provider_reference,
    expectedRecipient: recipient,
    expectedAmountLuna: bounty.reward_amount_luna,
  });
  if (verification.rejected) {
    await supabase('payment_transactions', {
      method: 'PATCH',
      query: { id: `eq.${transaction.id}` },
      body: { status: 'FAILED', error_message: verification.reason, updated_at: new Date().toISOString() },
      prefer: 'return=representation',
    });
    const error = new Error(verification.reason);
    error.statusCode = 400;
    throw error;
  }
  if (!verification.confirmed) return { confirmed: false, pending: true, message: verification.reason };

  const updated = await supabase('payment_transactions', {
    method: 'PATCH',
    query: { id: `eq.${transaction.id}` },
    body: { status: 'CONFIRMED', error_message: null, metadata: { ...transaction.metadata, verifiedAt: new Date().toISOString() }, updated_at: new Date().toISOString() },
    prefer: 'return=representation',
  });
  if (bounty.status === 'READY_TO_FUND') {
    await transitionBounty({
      bountyId: bounty.id,
      from: 'READY_TO_FUND',
      to: 'FUNDED',
      actorType: 'SYSTEM',
      actorId: 'nimiq',
      eventType: 'bounty.funded',
      metadata: { txHash: transaction.provider_reference },
    });
  }
  return { confirmed: true, transaction: updated[0] };
}

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const body = await readJson(req);

    if (body.action === 'sponsor-init') {
      const bounty = await ensureSponsorBounty(Number(body.issueNumber));
      if (!isApprovedSponsorBounty(bounty)) return json(res, 403, { error: 'Community sponsorship is not available for this bounty.' });
      return json(res, 200, {
        bountyId: bounty.id,
        issueNumber: bounty.source_issues.issue_number,
        title: bounty.title,
        rewardNim: SPONSOR_ISSUES.get(Number(bounty.source_issues.issue_number)).rewardNim,
        status: bounty.status,
        fundingAddress: requireEnv('NIMIQ_FUNDING_ADDRESS'),
      });
    }

    if (body.action === 'sponsor-submit' || body.action === 'sponsor-verify') {
      const bounty = await getBounty(body.bountyId);
      if (!bounty || !isApprovedSponsorBounty(bounty)) return json(res, 404, { error: 'Sponsor bounty not found.' });
      if (body.action === 'sponsor-submit') {
        const result = await recordFunding({ bounty, txHash: String(body.txHash || '').trim(), actorId: 'community-sponsor' });
        return json(res, 200, result);
      }
      const result = await verifyFunding(bounty);
      return json(res, result.confirmed ? 200 : 202, result);
    }

    const session = await getSession(req);
    if (!session) return json(res, 401, { error: 'Authentication required.' });

    const bounty = await getBounty(body.bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });
    if (bounty.creator_user_id !== session.user.id) return json(res, 403, { error: 'Only the bounty creator can record funding.' });

    if (body.action === 'submit') {
      const result = await recordFunding({ bounty, txHash: String(body.txHash || '').trim(), actorId: session.user.id });
      return json(res, 200, result);
    }
    if (body.action === 'verify') {
      const result = await verifyFunding(bounty);
      return json(res, result.confirmed ? 200 : 202, result);
    }

    return json(res, 400, { error: 'Unknown funding action.' });
  } catch (error) {
    handleError(res, error);
  }
}
