const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

function generateTokens(userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { token, refreshToken };
}

function sanitize(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

exports.register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password)
      return res.status(400).json({ error: 'All fields required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing)
      return res.status(409).json({ error: 'Email or username already taken' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });

    const tokens = generateTokens(user.id);
    res.status(201).json({ user: sanitize(user), ...tokens });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });

    const tokens = generateTokens(user.id);
    res.json({ user: sanitize(user), ...tokens });
  } catch (e) {
    next(e);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isBlocked)
      return res.status(401).json({ error: 'Invalid refresh token' });

    const tokens = generateTokens(user.id);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

exports.logout = (req, res) => res.json({ ok: true });

exports.me = async (req, res) => {
  res.json({ user: sanitize(req.user) });
};

exports.updateMe = async (req, res, next) => {
  try {
    const { username, language, theme } = req.body;
    const data = {};
    if (username !== undefined) data.username = username;
    if (language !== undefined) data.language = language;
    if (theme !== undefined) data.theme = theme;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    res.json({ user: sanitize(user) });
  } catch (e) {
    next(e);
  }
};
exports.oauthCallback = (req, res) => {
  const tokens = generateTokens(req.user.id);
  const url = new URL(`${process.env.CLIENT_URL}/oauth-callback`);
  url.searchParams.set('token', tokens.token);
  url.searchParams.set('refreshToken', tokens.refreshToken);
  res.redirect(url.toString());
};