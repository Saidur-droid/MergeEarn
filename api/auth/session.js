import { getSession, handleError, json, method } from '../_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const session = await getSession(req);
    json(res, 200, {
      authenticated: Boolean(session),
      user: session?.user ? {
        id: session.user.id,
        githubUserId: session.user.github_user_id,
        login: session.user.github_login,
        avatarUrl: session.user.avatar_url,
      } : null,
    });
  } catch (error) {
    handleError(res, error);
  }
}
