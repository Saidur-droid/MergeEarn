import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getSession,
  github,
  handleError,
  json,
  method,
  parseCookies,
  randomToken,
  requireEnv,
  sessionCookie,
  upsertUser,
} from './_lib/server.js';

function resolveAction(req) {
  const url = new URL(req.url, requireEnv('APP_URL'));
  const explicit = url.searchParams.get('action');
  if (explicit) return { action: explicit, url };

  const pathname = url.pathname.replace(/\/+$/, '');
  if (pathname.endsWith('/github/callback')) return { action: 'callback', url };
  if (pathname.endsWith('/github')) return { action: 'github', url };
  if (pathname.endsWith('/logout')) return { action: 'logout', url };
  if (pathname.endsWith('/session')) return { action: 'session', url };
  return { action: '', url };
}

async function startGitHubOAuth(req, res) {
  if (!method(req, res, ['GET'])) return;

  const state = randomToken(24);
  const redirectUri = new URL('/api/auth/github/callback', requireEnv('APP_URL')).toString();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', requireEnv('GITHUB_CLIENT_ID'));
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'read:user public_repo');
  authorize.searchParams.set('state', state);
  res.statusCode = 302;
  res.setHeader('set-cookie', `mergeearn_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.setHeader('location', authorize.toString());
  res.end();
}

async function completeGitHubOAuth(req, res, url) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = parseCookies(req).mergeearn_oauth_state;
  if (!code || !state || !expectedState || state !== expectedState) {
    const error = new Error('GitHub OAuth state validation failed.');
    error.statusCode = 400;
    throw error;
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'MergeEarn' },
    body: JSON.stringify({
      client_id: requireEnv('GITHUB_CLIENT_ID'),
      client_secret: requireEnv('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: new URL('/api/auth/github/callback', requireEnv('APP_URL')).toString(),
      state,
    }),
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || 'GitHub OAuth token exchange failed.');
  }

  const { data: profile } = await github('/user', tokenPayload.access_token);
  const user = await upsertUser(profile);
  const sessionToken = await createSession(user.id, tokenPayload.access_token);

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.statusCode = 302;
  res.setHeader('set-cookie', [
    sessionCookie(sessionToken),
    `mergeearn_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  ]);
  res.setHeader('location', new URL('/', requireEnv('APP_URL')).toString());
  res.end();
}

async function logout(req, res) {
  if (!method(req, res, ['POST'])) return;
  await deleteSession(req);
  res.setHeader('set-cookie', clearSessionCookie());
  json(res, 200, { ok: true });
}

async function session(req, res) {
  if (!method(req, res, ['GET'])) return;
  const current = await getSession(req);
  json(res, 200, {
    authenticated: Boolean(current),
    user: current?.user ? {
      id: current.user.id,
      githubUserId: current.user.github_user_id,
      login: current.user.github_login,
      avatarUrl: current.user.avatar_url,
    } : null,
  });
}

export default async function handler(req, res) {
  try {
    const { action, url } = resolveAction(req);
    if (action === 'github') return await startGitHubOAuth(req, res);
    if (action === 'callback') return await completeGitHubOAuth(req, res, url);
    if (action === 'logout') return await logout(req, res);
    if (action === 'session') return await session(req, res);
    json(res, 404, { error: 'Unknown auth route.' });
  } catch (error) {
    handleError(res, error);
  }
}
