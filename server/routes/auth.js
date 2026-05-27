const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { signToken, authRequired, setAuthCookie } = require('../middleware/auth');

const router = express.Router();
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    hasGoogle: Boolean(row.google_id),
  };
}

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

router.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if (!email?.trim() || !name?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (findUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    )
    .run(normalizedEmail, name.trim(), hash);

  const user = findUserById(result.lastInsertRowid);
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user: publicUser(user), token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = findUserByEmail(email.trim().toLowerCase());
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user), token });
});

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google credential required' });
  }
  if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: 'Google Sign-In not configured. Set GOOGLE_CLIENT_ID in .env',
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email?.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name || email?.split('@')[0] || 'User';
    const avatar = payload.picture || null;

    if (!email) {
      return res.status(400).json({ error: 'Google account has no email' });
    }

    let user =
      db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) ||
      findUserByEmail(email);

    if (user) {
      db.prepare(
        `UPDATE users SET google_id = ?, name = ?, avatar_url = COALESCE(?, avatar_url)
         WHERE id = ?`
      ).run(googleId, name, avatar, user.id);
      user = findUserById(user.id);
    } else {
      const result = db
        .prepare(
          'INSERT INTO users (email, name, google_id, avatar_url) VALUES (?, ?, ?, ?)'
        )
        .run(email, name, googleId, avatar);
      user = findUserById(result.lastInsertRowid);
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user: publicUser(user), token });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

router.get('/me', authRequired, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('taskflow_token');
  res.json({ ok: true });
});

router.get('/config', (_req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

module.exports = router;
