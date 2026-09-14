import crypto from 'node:crypto';

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };
const SESSION_COOKIE = 'mergeearn_session';

export function json(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  for (const [key, value] of Object.entries({ ...jsonHeaders, ...extraHeaders })) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

export function method(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.setHeader('allow', allowed.join(', '));
    json(res, 405, { error: 'Method not allowed' });
    return false;
  }
  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON body.'); }
}

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

function base64url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encryptionKey() {
  const source = requireEnv('SESSION_ENCRYPTION_KEY');
  return crypto.createHash('sha256').update(source).digest();
}

export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [base64url(iv), base64url(tag), base64url(encrypted)].join('.');
}

export function decryptSecret(payload) {
  const [ivPart, tagPart, dataPart] = String(payload).split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Invalid encrypted secret.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}

export function randomToken(bytes = 32) {
  return base64url(crypto.randomBytes(bytes));
}

export function parseCookies(req) {
  const result = {};
  const header = req.headers.cookie || '';
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    result[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return result;
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function supabase(path, { method: httpMethod = 'GET', body, query, prefer } = {}) {
  const url = new URL(`/rest/v1/${path.replace(/^\//, '')}`, requireEnv('SUPABASE_URL'));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const headers = { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (prefer) headers.prefer = prefer;
  const response = await fetch(url, { method: httpMethod, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  const parsed = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    const message = parsed?.message || parsed?.hint || parsed?.details || `${response.status} ${response.statusText}`;
    throw new Error(`Database error: ${message}`);
  }
  return parsed;
}

export async function rpc(name, body) {
  return supabase(`rpc/${name}`, { method: 'POST', body });
}

export async function upsertUser(profile) {
  const rows = await supabase('users', {
    method: 'POST',
    query: { on_conflict: 'github_user_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      github_user_id: profile.id,
      github_login: profile.login,
      avatar_url: profile.avatar_url || null,
      updated_at: new Date().toISOString(),
    },
  });
  return rows[0];
}

export async function createSession(userId, githubToken) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await supabase('sessions', {
    method: 'POST',
    body: {
      user_id: userId,
      token_hash: sha256(token),
      github_access_token_ciphertext: encryptSecret(githubToken),
      expires_at: expiresAt,
    },
  });
  return token;
}

export async function getSession(req) {
  const raw = parseCookies(req)[SESSION_COOKIE];
  if (!raw) return null;
  const rows = await supabase('sessions', {
    query: {
      select: 'id,user_id,github_access_token_ciphertext,expires_at,users(id,github_user_id,github_login,avatar_url)',
      token_hash: `eq.${sha256(raw)}`,
      expires_at: `gt.${new Date().toISOString()}`,
      limit: 1,
    },
  });
  const row = rows?.[0];
  if (!row) return null;
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  return { id: row.id, user, githubToken: decryptSecret(row.github_access_token_ciphertext), rawToken: raw };
}

export async function requireSession(req) {
  const session = await getSession(req);
  if (!session) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }
  return session;
}

export async function deleteSession(req) {
  const raw = parseCookies(req)[SESSION_COOKIE];
  if (!raw) return;
  await supabase('sessions', { method: 'DELETE', query: { token_hash: `eq.${sha256(raw)}` } });
}

export async function github(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'MergeEarn',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub returned ${response.status}.`);
    error.statusCode = response.status;
    throw error;
  }
  return { data, headers: response.headers };
}

export function hasMaintainerPermission(repo) {
  const permissions = repo?.permissions || {};
  return Boolean(permissions.admin || permissions.maintain || permissions.push);
}

export async function assertRepoMaintainer(token, owner, repo) {
  const { data } = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token);
  if (!hasMaintainerPermission(data)) {
    const error = new Error('Maintainer or push permission is required for this repository.');
    error.statusCode = 403;
    throw error;
  }
  return data;
}

export async function persistRepository(repo) {
  const rows = await supabase('github_repositories', {
    method: 'POST',
    query: { on_conflict: 'github_repository_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      github_repository_id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      full_name: repo.full_name,
      default_branch: repo.default_branch,
      permissions: repo.permissions || {},
      updated_at: new Date().toISOString(),
    },
  });
  return rows[0];
}

export async function persistIssue(repositoryId, issue) {
  const rows = await supabase('source_issues', {
    method: 'POST',
    query: { on_conflict: 'repository_id,github_issue_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      repository_id: repositoryId,
      github_issue_id: issue.id,
      issue_number: issue.number,
      title: issue.title,
      body: issue.body || null,
      html_url: issue.html_url,
      state: issue.state,
      updated_at: new Date().toISOString(),
    },
  });
  return rows[0];
}

export async function getBounty(id) {
  const rows = await supabase('bounties', {
    query: {
      select: '*,github_repositories(*),source_issues(*),claims(*),submissions(*),payment_transactions(*),audit_events(*)',
      id: `eq.${id}`,
      limit: 1,
    },
  });
  return rows?.[0] || null;
}

export function nimToLuna(value) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,5})?$/.test(normalized)) throw new Error('NIM amount must be positive with up to 5 decimal places.');
  const [whole, fraction = ''] = normalized.split('.');
  const luna = BigInt(whole) * 100000n + BigInt(fraction.padEnd(5, '0'));
  if (luna <= 0n || luna > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Invalid NIM amount.');
  return Number(luna);
}

export function lunaToNim(luna) {
  const value = BigInt(luna);
  const whole = value / 100000n;
  const fraction = String(value % 100000n).padStart(5, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export async function transitionBounty({ bountyId, from, to, actorType, actorId, eventType, metadata = {} }) {
  const result = await rpc('transition_bounty', {
    p_bounty_id: bountyId,
    p_from: from,
    p_to: to,
    p_actor_type: actorType,
    p_actor_id: actorId == null ? null : String(actorId),
    p_event_type: eventType,
    p_metadata: metadata,
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function nimiqRpc(methodName, params = []) {
  const endpoint = requireEnv('NIMIQ_RPC_URL');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: randomToken(8), method: methodName, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `Nimiq RPC returned ${response.status}.`);
  return payload.result;
}

function normalizeAddress(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

export async function verifyNimiqTransaction({ hash, expectedRecipient, expectedAmountLuna, expectedSender }) {
  const result = await nimiqRpc('getTransactionByHash', [hash]);
  if (!result) return { confirmed: false, reason: 'Transaction not found yet.' };
  const recipient = result.recipient || result.to || result.recipientAddress;
  const sender = result.sender || result.from || result.senderAddress;
  const value = Number(result.value ?? result.amount ?? result.valueLunas ?? 0);
  const blockNumber = result.blockNumber ?? result.block_number ?? result.blockHeight ?? null;
  const executionResult = result.executionResult ?? result.execution_result ?? true;
  if (expectedRecipient && normalizeAddress(recipient) !== normalizeAddress(expectedRecipient)) {
    return { confirmed: false, rejected: true, reason: 'Transaction recipient does not match the bounty payment address.', result };
  }
  if (expectedSender && normalizeAddress(sender) !== normalizeAddress(expectedSender)) {
    return { confirmed: false, rejected: true, reason: 'Transaction sender does not match the expected payout wallet.', result };
  }
  if (Number(expectedAmountLuna) !== value) {
    return { confirmed: false, rejected: true, reason: 'Transaction amount does not match the bounty amount.', result };
  }
  if (executionResult === false) return { confirmed: false, rejected: true, reason: 'Transaction execution failed.', result };
  if (blockNumber == null) return { confirmed: false, reason: 'Transaction is pending confirmation.', result };
  return { confirmed: true, result };
}

export function handleError(res, error) {
  console.error(error);
  const status = Number(error?.statusCode) || 500;
  json(res, status, { error: status >= 500 ? 'Server request failed.' : error.message, detail: process.env.NODE_ENV === 'production' ? undefined : error.message });
}
