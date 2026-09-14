import { assertRepoMaintainer, getBounty, handleError, json, method, readJson, requireSession, transitionBounty } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const session = await requireSession(req);
    const body = await readJson(req);
    const bounty = await getBounty(body.bountyId);
    if (!bounty) return json(res, 404, { error: 'Bounty not found.' });
    if (bounty.status !== 'VERIFIED') {
      const error = new Error('Only a verified bounty can be approved for payout.');
      error.statusCode = 409;
      throw error;
    }
    const repo = bounty.github_repositories;
    await assertRepoMaintainer(session.githubToken, repo.owner, repo.name);
    const changed = await transitionBounty({
      bountyId: bounty.id,
      from: 'VERIFIED',
      to: 'APPROVED',
      actorType: 'USER',
      actorId: session.user.id,
      eventType: 'bounty.approved',
      metadata: { repository: repo.full_name },
    });
    json(res, 200, { bounty: changed });
  } catch (error) {
    handleError(res, error);
  }
}
