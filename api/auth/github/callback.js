import { createSession, github, handleError, parseCookies, requireEnv, sessionCookie, upsertUser } from '../../_lib/server.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  try {
    const url = new URL(req.url, requireEnv('APP_URL'));
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
  } catch (error) {
    handleError(res, error);
  }
}
