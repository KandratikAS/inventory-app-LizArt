const prisma = require('../config/prisma');

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        isBlocked: false,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, email: true, avatarUrl: true },
      take: 10,
    });
    res.json({ users });
  } catch (e) {
    next(e);
  }
};

exports.tags = async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = q
      ? { name: { startsWith: q, mode: 'insensitive' } }
      : {};
    const tags = await prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 20,
    });
    res.json({ tags });
  } catch (e) {
    next(e);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { inventories: true, items: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (e) {
    next(e);
  }
};

exports.listAll = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        isAdmin: true,
        isBlocked: true,
        createdAt: true,
        _count: { select: { inventories: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (e) {
    next(e);
  }
};

exports.block = async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isBlocked: true } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

exports.unblock = async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isBlocked: false } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Deleting user:', id, 'Admin:', req.user?.id);

    await prisma.item.updateMany({
      where: { createdById: id },
      data: { createdById: null },
    });

    const invResult = await prisma.inventory.updateMany({
      where: { ownerId: id },
      data: { ownerId: req.user.id },
    });
    console.log('Inventories transferred:', invResult.count);

    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

exports.setAdmin = async (req, res, next) => {
  try {
    const { isAdmin } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isAdmin: !!isAdmin },
      select: { id: true, isAdmin: true },
    });
    res.json({ user });
  } catch (e) {
    next(e);
  }
};