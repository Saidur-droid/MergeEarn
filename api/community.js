import { handleError, json, method, readJson, requireSession, supabase } from './_lib/server.js';

const JOIN_EVENT = 'community.contributor_joined';

function normalizeAddress(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function validNimiqAddress(value) {
  const compact = value.replace(/\s+/g, '');
  return compact.startsWith('NQ') && compact.length >= 30 && compact.length <= 44;
}

export default async function handler(req, res) {
  if (!method(req, res, ['GET', 'POST'])) return;

  try {
    const session = await requireSession(req);
    const existing = await supabase('audit_events', {
      query: {
        select: 'id,created_at,metadata',
        actor_type: 'eq.USER',
        actor_id: `eq.${session.user.id}`,
        event_type: `eq.${JOIN_EVENT}`,
        order: 'created_at.asc',
        limit: 1,
      },
    });

    if (req.method === 'GET') {
      return json(res, 200, {
        joined: Boolean(existing?.[0]),
        joinedAt: existing?.[0]?.created_at || null,
      }, { 'cache-control': 'private, no-store' });
    }

    if (existing?.[0]) {
      return json(res, 200, {
        joined: true,
        joinedAt: existing[0].created_at,
        alreadyJoined: true,
      });
    }

    const body = await readJson(req);
    const nimiqAddress = normalizeAddress(body.nimiqAddress);
    if (!validNimiqAddress(nimiqAddress)) {
      return json(res, 400, { error: 'Connect a valid Nimiq Pay account before joining.' });
    }

    const rows = await supabase('audit_events', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        bounty_id: null,
        actor_type: 'USER',
        actor_id: session.user.id,
        event_type: JOIN_EVENT,
        metadata: {
          githubLogin: session.user.github_login,
          nimiqAddress,
          source: 'nimiq-pay-contributor-pool',
        },
      },
    });

    return json(res, 201, {
      joined: true,
      joinedAt: rows?.[0]?.created_at || new Date().toISOString(),
    });
  } catch (error) {
    handleError(res, error);
  }
}
