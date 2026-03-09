const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * Attach req.user if a valid Bearer token is present.
 * Does NOT block the request — use requireAuth for that.
 */
exports.authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    req.user = user && !user.isBlocked ? user : null;
  } catch {
    req.user = null;
  }
  next();
};

exports.requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
};