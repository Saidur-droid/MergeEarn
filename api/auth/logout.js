import { clearSessionCookie, deleteSession, handleError, json, method } from '../_lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    await deleteSession(req);
    res.setHeader('set-cookie', clearSessionCookie());
    json(res, 200, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
}
