import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getAdmin, verifyIdToken } from '../firebaseAdmin.js';

/**
 * Auth flow
 *  1. The frontend logs in with Firebase Authentication.
 *  2. It calls POST /api/auth/session with its Firebase ID token.
 *  3. The backend verifies that token with Firebase Admin and returns its own
 *     short-lived JWT, signed with JWT_SECRET.
 *  4. Every other API call sends `Authorization: Bearer <that JWT>`.
 */

export function signSession(user) {
  return jwt.sign({ name: user.name, email: user.email }, config.jwtSecret, { subject: user.uid, expiresIn: config.jwtExpiresIn });
}

/** POST /api/auth/session */
export async function createSession(req, res) {
  const header = req.get('authorization') ?? '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  let user = null;

  if (getAdmin()) {
    if (!idToken) return res.status(401).json({ error: 'Missing Firebase ID token.' });
    try {
      const d = await verifyIdToken(idToken);
      user = { uid: d.uid, email: d.email ?? '', name: req.body?.name || d.name || d.email || 'Organizer' };
    } catch {
      return res.status(401).json({ error: 'Invalid or expired Firebase login. Please log in again.' });
    }
  } else if (config.allowInsecureDev && req.body?.uid) {
    // Development without serviceAccountKey.json: trust the user info sent by the frontend.
    user = { uid: String(req.body.uid), email: String(req.body.email ?? ''), name: String(req.body.name ?? 'Organizer') };
  } else {
    return res.status(401).json({ error: 'Backend cannot verify logins: add serviceAccountKey.json (see README).' });
  }

  res.json({ token: signSession(user), user, verified: Boolean(getAdmin()) });
}

/** Middleware: requires a valid EventFlow JWT. */
export function requireUser(req, res, next) {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.', code: 'no_session' });
  try {
    const p = jwt.verify(token, config.jwtSecret);
    req.user = { uid: p.sub, email: p.email ?? '', name: p.name ?? 'Organizer' };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please try again.', code: 'no_session' });
  }
}
