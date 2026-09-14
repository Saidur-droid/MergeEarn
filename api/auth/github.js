import { json, method, randomToken, requireEnv, sessionCookie } from '../_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const state = randomToken(24);
    const redirectUri = new URL('/api/auth/github/callback', requireEnv('APP_URL')).toString();
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', requireEnv('GITHUB_CLIENT_ID'));
    authorize.searchParams.set('redirect_uri', redirectUri);
    authorize.searchParams.set('scope', 'read:user repo');
    authorize.searchParams.set('state', state);
    res.statusCode = 302;
    res.setHeader('set-cookie', `mergeearn_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    res.setHeader('location', authorize.toString());
    res.end();
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}
