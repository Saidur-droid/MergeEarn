import { github, handleError, hasMaintainerPermission, json, method, persistRepository, requireSession } from './_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const session = await requireSession(req);
    const { data } = await github('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', session.githubToken);
    const managed = [];
    for (const repo of data.filter((item) => !item.private && hasMaintainerPermission(item))) {
      const persisted = await persistRepository(repo);
      managed.push({
        id: persisted.id,
        githubRepositoryId: repo.id,
        fullName: repo.full_name,
        owner: repo.owner.login,
        name: repo.name,
        defaultBranch: repo.default_branch,
        private: false,
        permissions: repo.permissions,
      });
    }
    json(res, 200, { repositories: managed });
  } catch (error) {
    handleError(res, error);
  }
}
