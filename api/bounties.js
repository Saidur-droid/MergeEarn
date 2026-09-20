import { assertRepoMaintainer, getBounty, handleError, json, lunaToNim, method, nimToLuna, readJson, requireSession, supabase, transitionBounty } from './_lib/server.js';

function shapeBounty(row) {
  if (!row) return null;
  const {
    audit_events: _auditEvents,
    ai_metadata: _aiMetadata,
    payment_transactions: paymentTransactions,
    claims,
    ...safe
  } = row;
  return {
    ...safe,
    reward_amount_nim: lunaToNim(row.reward_amount_luna),
    claims: Array.isArray(claims) ? claims.map((claim) => ({
      id: claim.id,
      status: claim.status,
      contributor_user_id: claim.contributor_user_id,
    })) : undefined,
    payment_transactions: Array.isArray(paymentTransactions) ? paymentTransactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      providerReference: transaction.status === 'CONFIRMED' ? transaction.provider_reference || undefined : undefined,
    })) : undefined,
  };
}

export default async function handler(req, res) {
  if (!method(req, res, ['GET', 'POST', 'PATCH'])) return;
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      if (id) {
        const bounty = await getBounty(id);
        if (!bounty) return json(res, 404, { error: 'Bounty not found.' });
        return json(res, 200, { bounty: shapeBounty(bounty) });
      }
      const rows = await supabase('bounties', {
        query: {
          select: '*,github_repositories(full_name,default_branch),source_issues(issue_number,title,html_url),claims(id,status,contributor_user_id),submissions(id,verification_status,html_url,merged_at),payment_transactions(id,type,status,provider_reference)',
          order: 'created_at.desc',
          limit: 100,
        },
      });
      return json(res, 200, { bounties: rows.map(shapeBounty) }, { 'cache-control': 'public, s-maxage=15, stale-while-revalidate=30' });
    }

    const session = await requireSession(req);
    const body = await readJson(req);

    if (req.method === 'PATCH') {
      const bounty = await getBounty(body.id);
      if (!bounty) return json(res, 404, { error: 'Bounty not found.' });
      const repo = bounty.github_repositories;
      await assertRepoMaintainer(session.githubToken, repo.owner, repo.name);
      if (body.action !== 'publish' || bounty.status !== 'DRAFT') {
        const error = new Error('Only publishing a DRAFT bounty is supported by this endpoint.');
        error.statusCode = 400;
        throw error;
      }
      const changed = await transitionBounty({
        bountyId: bounty.id,
        from: 'DRAFT',
        to: 'READY_TO_FUND',
        actorType: 'USER',
        actorId: session.user.id,
        eventType: 'bounty.ready_to_fund',
      });
      return json(res, 200, { bounty: shapeBounty(changed) });
    }

    const [repo] = await supabase('github_repositories', { query: { id: `eq.${body.repositoryId}`, limit: 1 } });
    const [issue] = await supabase('source_issues', { query: { id: `eq.${body.sourceIssueId}`, repository_id: `eq.${body.repositoryId}`, limit: 1 } });
    if (!repo || !issue) {
      const error = new Error('Repository or issue was not found.');
      error.statusCode = 400;
      throw error;
    }
    await assertRepoMaintainer(session.githubToken, repo.owner, repo.name);

    const criteria = Array.isArray(body.acceptanceCriteria)
      ? body.acceptanceCriteria.map((item) => String(item).trim()).filter(Boolean)
      : [];
    if (!String(body.title || '').trim() || !String(body.summary || '').trim() || criteria.length === 0) {
      const error = new Error('Title, summary, and at least one acceptance criterion are required.');
      error.statusCode = 400;
      throw error;
    }

    const rows = await supabase('bounties', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        repository_id: repo.id,
        source_issue_id: issue.id,
        creator_user_id: session.user.id,
        title: String(body.title).trim().slice(0, 240),
        description: String(body.summary).trim().slice(0, 5000),
        acceptance_criteria: criteria.slice(0, 12).map((item) => item.slice(0, 1000)),
        reward_amount_luna: nimToLuna(body.rewardNim),
        reward_asset: 'NIM',
        status: 'DRAFT',
        ai_metadata: body.aiMetadata || {},
      },
    });
    await supabase('audit_events', {
      method: 'POST',
      body: { bounty_id: rows[0].id, actor_type: 'USER', actor_id: session.user.id, event_type: 'bounty.created', metadata: {} },
    });
    json(res, 201, { bounty: shapeBounty(rows[0]) });
  } catch (error) {
    handleError(res, error);
  }
}
