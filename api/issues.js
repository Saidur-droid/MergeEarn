import { assertRepoMaintainer, github, handleError, json, method, persistIssue, persistRepository, requireSession } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const session = await requireSession(req);
    const url = new URL(req.url, 'http://localhost');
    const owner = url.searchParams.get('owner');
    const repo = url.searchParams.get('repo');
    if (!owner || !repo) {
      const error = new Error('owner and repo are required.');
      error.statusCode = 400;
      throw error;
    }
    const canonicalRepo = await assertRepoMaintainer(session.githubToken, owner, repo);
    const storedRepo = await persistRepository(canonicalRepo);
    const { data } = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=100`, session.githubToken);
    const issues = [];
    for (const issue of data.filter((item) => !item.pull_request)) {
      const stored = await persistIssue(storedRepo.id, issue);
      issues.push({
        id: stored.id,
        githubIssueId: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        htmlUrl: issue.html_url,
        state: issue.state,
      });
    }
    json(res, 200, { repository: { id: storedRepo.id, fullName: canonicalRepo.full_name, defaultBranch: canonicalRepo.default_branch }, issues });
  } catch (error) {
    handleError(res, error);
  }
}
