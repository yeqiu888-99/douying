import session from 'express-session';
import dotenv from 'dotenv';

dotenv.config();

export function sessionMiddleware() {
  return session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
  });
}

export function requireAdmin(req, res, next) {
  if (req.session && req.session.adminAuthed) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

export function handleLogin(req, res) {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    req.session.adminAuthed = true;
    return res.json({ message: 'ok' });
  }
  res.status(401).json({ message: 'Invalid credentials' });
}
