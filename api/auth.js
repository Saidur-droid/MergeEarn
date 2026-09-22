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
  supabase,
  upsertUser,
} from './_lib/server.js';

const ACQUISITION_EVENT = 'acquisition.github_registered';
const ALLOWED_ACQUISITION_SOURCES = new Set(['nimiq-space', 'skool', 'x', 'github', 'referral']);

function normalizeAcquisitionSource(value) {
  const source = String(value || '').trim().toLowerCase();
  return ALLOWED_ACQUISITION_SOURCES.has(source) ? source : null;
}

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function requestOrigin(req) {
  const proto = firstHeaderValue(req.headers['x-forwarded-proto']) || 'https';
  const host = firstHeaderValue(req.headers['x-forwarded-host']) || firstHeaderValue(req.headers.host);
  return host ? `${proto}://${host}` : '';
}

function queryValue(req, url, name) {
  const value = req.query?.[name];
  if (Array.isArray(value)) return value[0] ?? null;
  if (value !== undefined && value !== null && value !== '') return String(value);
  return url.searchParams.get(name);
}

function resolveAction(req) {
  const url = new URL(req.url, requireEnv('APP_URL'));
  const explicit = queryValue(req, url, 'action');
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

  const appUrl = new URL(requireEnv('APP_URL'));
  const origin = requestOrigin(req);
  if (origin && origin !== appUrl.origin) {
    res.statusCode = 302;
    res.setHeader('location', new URL('/api/auth/github', appUrl).toString());
    res.end();
    return;
  }

  const state = randomToken(24);
  const url = new URL(req.url, appUrl);
  const acquisitionSource = normalizeAcquisitionSource(queryValue(req, url, 'src'));
  const redirectUri = new URL('/api/auth/github/callback', appUrl).toString();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', requireEnv('GITHUB_CLIENT_ID'));
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'read:user public_repo');
  authorize.searchParams.set('state', state);
  res.statusCode = 302;
  const secure = appUrl.protocol === 'https:' ? '; Secure' : '';
  const sourceCookie = acquisitionSource
    ? `mergeearn_acq_source=${encodeURIComponent(acquisitionSource)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
    : `mergeearn_acq_source=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  res.setHeader('set-cookie', [
    `mergeearn_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
    sourceCookie,
  ]);
  res.setHeader('location', authorize.toString());
  res.end();
}

async function completeGitHubOAuth(req, res, url) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  const code = queryValue(req, url, 'code');
  const state = queryValue(req, url, 'state');
  const expectedState = parseCookies(req).mergeearn_oauth_state;

  if (!code) {
    const error = new Error('GitHub OAuth callback did not include an authorization code.');
    error.statusCode = 400;
    throw error;
  }
  if (!state) {
    const error = new Error('GitHub OAuth callback did not include state.');
    error.statusCode = 400;
    throw error;
  }
  if (!expectedState) {
    const error = new Error('GitHub OAuth state cookie is missing. Start sign-in again from the production app URL.');
    error.statusCode = 400;
    throw error;
  }
  if (state !== expectedState) {
    const error = new Error('GitHub OAuth state validation failed. Start sign-in again.');
    error.statusCode = 400;
    throw error;
  }

  const appUrl = new URL(requireEnv('APP_URL'));
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'MergeEarn' },
    body: JSON.stringify({
      client_id: requireEnv('GITHUB_CLIENT_ID'),
      client_secret: requireEnv('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: new URL('/api/auth/github/callback', appUrl).toString(),
    }),
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || 'GitHub OAuth token exchange failed.');
  }

  const { data: profile } = await github('/user', tokenPayload.access_token);
  const user = await upsertUser(profile);
  const acquisitionSource = normalizeAcquisitionSource(parseCookies(req).mergeearn_acq_source) || 'direct';
  const existingAcquisition = await supabase('audit_events', {
    query: {
      select: 'id',
      actor_type: 'eq.USER',
      actor_id: `eq.${user.id}`,
      event_type: `eq.${ACQUISITION_EVENT}`,
      limit: 1,
    },
  });
  if (!existingAcquisition?.[0]) {
    await supabase('audit_events', {
      method: 'POST',
      body: {
        bounty_id: null,
        actor_type: 'USER',
        actor_id: user.id,
        event_type: ACQUISITION_EVENT,
        metadata: { source: acquisitionSource },
      },
    });
  }
  const sessionToken = await createSession(user.id, tokenPayload.access_token);

  const secure = appUrl.protocol === 'https:' ? '; Secure' : '';
  res.statusCode = 302;
  res.setHeader('set-cookie', [
    sessionCookie(sessionToken),
    `mergeearn_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `mergeearn_acq_source=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  ]);
  res.setHeader('location', new URL('/', appUrl).toString());
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
