import { getBounty, github, handleError, json, method, readJson, requireSession, supabase, transitionBounty } from './_lib/server.js';

function parsePullUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { throw new Error('Enter a valid GitHub pull request URL.'); }
  if (!['github.com', 'www.github.com'].includes(url.hostname)) throw new Error('Pull request must be on github.com.');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 4 || parts[2] !== 'pull' || !/^\d+$/.test(parts[3])) throw new Error('Use a GitHub pull request URL like github.com/owner/repo/pull/123.');
  return { owner: parts[0], repo: parts[1], number: Number(parts[3]) };
}

async function fetchCanonicalPr(token, pullUrl, bounty) {
  const parsed = parsePullUrl(pullUrl);
  const repo = bounty.github_repositories;
  if (`${parsed.owner}/${parsed.repo}`.toLowerCase() !== repo.full_name.toLowerCase()) {
    const error = new Error(`Pull request must belong to ${repo.full_name}.`);
    error.statusCode = 400;
    throw error;
  }
  const { data } = await github(`/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/pulls/${parsed.number}`, token);
  if (data.base?.ref !== repo.default_branch) {
    const error = new Error(`Pull request must target ${repo.default_branch}.`);
    error.statusCode = 400;
    throw error;
  }
  return data;
}

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const session = await requireSession(req);
    const body = await readJson(req);
    const bounty = await getBounty(body.bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });

    const activeClaim = (bounty.claims || []).find((claim) => claim.status === 'ACTIVE');
    if (!activeClaim || activeClaim.contributor_user_id !== session.user.id) {
      const error = new Error('Only the active claimant can submit or verify this pull request.');
      error.statusCode = 403;
      throw error;
    }

    if (body.action === 'submit') {
      if (bounty.status !== 'CLAIMED') {
        const error = new Error('Bounty must be CLAIMED before a pull request can be submitted.');
        error.statusCode = 409;
        throw error;
      }
      const pr = await fetchCanonicalPr(session.githubToken, body.pullRequestUrl, bounty);
      const rows = await supabase('submissions', {
        method: 'POST',
        query: { on_conflict: 'bounty_id' },
        prefer: 'resolution=merge-duplicates,return=representation',
        body: {
          bounty_id: bounty.id,
          claim_id: activeClaim.id,
          github_pull_request_id: pr.id,
          pull_request_number: pr.number,
          html_url: pr.html_url,
          head_sha: pr.head.sha,
          base_branch: pr.base.ref,
          pr_author_login: pr.user?.login || null,
          merged_at: pr.merged_at,
          verification_status: pr.merged ? 'VERIFIED' : 'PENDING',
          updated_at: new Date().toISOString(),
        },
      });
      await transitionBounty({
        bountyId: bounty.id,
        from: 'CLAIMED',
        to: 'PR_SUBMITTED',
        actorType: 'USER',
        actorId: session.user.id,
        eventType: 'submission.pr_linked',
        metadata: { pullRequestNumber: pr.number, headSha: pr.head.sha },
      });
      if (pr.merged) {
        await transitionBounty({
          bountyId: bounty.id,
          from: 'PR_SUBMITTED',
          to: 'VERIFIED',
          actorType: 'SYSTEM',
          actorId: 'github',
          eventType: 'submission.verified',
          metadata: { mergedAt: pr.merged_at, headSha: pr.head.sha },
        });
      }
      return json(res, 201, { submission: rows[0], merged: Boolean(pr.merged) });
    }

    if (body.action === 'verify') {
      const submission = (bounty.submissions || [])[0];
      if (!submission) {
        const error = new Error('No pull request is linked to this bounty.');
        error.statusCode = 409;
        throw error;
      }
      const pr = await fetchCanonicalPr(session.githubToken, submission.html_url, bounty);
      await supabase('submissions', {
        method: 'PATCH',
        query: { id: `eq.${submission.id}` },
        prefer: 'return=representation',
        body: {
          head_sha: pr.head.sha,
          base_branch: pr.base.ref,
          pr_author_login: pr.user?.login || null,
          merged_at: pr.merged_at,
          verification_status: pr.merged ? 'VERIFIED' : 'PENDING',
          updated_at: new Date().toISOString(),
        },
      });
      if (pr.merged && bounty.status === 'PR_SUBMITTED') {
        await transitionBounty({
          bountyId: bounty.id,
          from: 'PR_SUBMITTED',
          to: 'VERIFIED',
          actorType: 'SYSTEM',
          actorId: 'github',
          eventType: 'submission.verified',
          metadata: { mergedAt: pr.merged_at, headSha: pr.head.sha },
        });
      }
      return json(res, 200, { verified: Boolean(pr.merged), pullRequest: { number: pr.number, htmlUrl: pr.html_url, merged: pr.merged, mergedAt: pr.merged_at, baseBranch: pr.base.ref, headSha: pr.head.sha } });
    }

    const error = new Error('Unknown submission action.');
    error.statusCode = 400;
    throw error;
  } catch (error) {
    handleError(res, error);
  }
}
