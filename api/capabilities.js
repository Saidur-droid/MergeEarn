import { assertRepoMaintainer, getBounty, handleError, json, method, requireSession } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const session = await requireSession(req);
    const url = new URL(req.url, 'http://localhost');
    const bountyId = url.searchParams.get('bountyId');
    if (!bountyId) {
      return json(res, 400, { error: 'bountyId is required' });
    }

    const bounty = await getBounty(bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });

    const repo = bounty.github_repositories;
    let canManage = false;
    try {
      await assertRepoMaintainer(session.githubToken, repo.owner, repo.name);
      canManage = true;
    } catch {
      canManage = false;
    }

    json(res, 200, { canManage });
  } catch (error) {
    handleError(res, error);
  }
}
