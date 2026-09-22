import { getBounty, getSession, github, handleError, json, method, supabase } from './_lib/server.js';

function parseRepository(fullName) {
  const [owner, repo] = String(fullName || '').split('/');
  if (!owner || !repo) throw new Error('Bounty repository is invalid.');
  return { owner, repo };
}

function summarizeChecks(status, checkRuns) {
  const runs = Array.isArray(checkRuns?.check_runs) ? checkRuns.check_runs : [];
  const bad = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']);
  if (runs.some((run) => bad.has(run.conclusion))) return 'failing';
  if (runs.some((run) => run.status !== 'completed')) return 'pending';
  if (status?.state === 'failure' || status?.state === 'error') return 'failing';
  if (status?.state === 'pending') return 'pending';
  if (runs.length || status?.state === 'success') return 'passing';
  return 'unknown';
}

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const url = new URL(req.url, 'http://localhost');
    const bountyId = url.searchParams.get('bountyId');
    if (!bountyId) return json(res, 400, { error: 'bountyId is required.' });

    const bounty = await getBounty(bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });

    const session = await getSession(req);
    const publicRepository = process.env.PUBLIC_BOUNTY_REPOSITORY?.trim() || 'Saidur-droid/MergeEarn';
    if (!session && bounty.github_repositories?.full_name !== publicRepository) {
      return json(res, 404, { error: 'Bounty not found.' });
    }

    const submissions = await supabase('submissions', {
      query: { bounty_id: `eq.${bounty.id}`, order: 'created_at.desc', limit: 1 },
    });
    const submission = submissions?.[0];
    if (!submission?.head_sha) {
      return json(res, 200, { state: 'unknown', totalChecks: 0, completedChecks: 0, headSha: null });
    }

    const { owner, repo } = parseRepository(bounty.github_repositories?.full_name);
    const token = session?.githubToken || process.env.GITHUB_READ_TOKEN?.trim() || null;
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const encodedSha = encodeURIComponent(submission.head_sha);

    const [statusResult, checkResult] = await Promise.all([
      github(`/repos/${encodedOwner}/${encodedRepo}/commits/${encodedSha}/status`, token).catch(() => ({ data: { state: null } })),
      github(`/repos/${encodedOwner}/${encodedRepo}/commits/${encodedSha}/check-runs?per_page=100`, token).catch(() => ({ data: { check_runs: [] } })),
    ]);
    const runs = Array.isArray(checkResult.data?.check_runs) ? checkResult.data.check_runs : [];
    const state = summarizeChecks(statusResult.data, checkResult.data);

    return json(res, 200, {
      state,
      totalChecks: runs.length,
      completedChecks: runs.filter((run) => run.status === 'completed').length,
      headSha: submission.head_sha,
    }, { 'cache-control': session ? 'private, no-store' : 'public, s-maxage=30, stale-while-revalidate=60' });
  } catch (error) {
    handleError(res, error);
  }
}
