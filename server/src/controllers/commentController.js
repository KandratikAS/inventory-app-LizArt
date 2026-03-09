const prisma = require('../config/prisma');
const { emitToInventory } = require('../utils/socket');


exports.list = async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { inventoryId: req.params.inventoryId },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    const comment = await prisma.comment.create({
      data: {
        content,
        inventoryId: req.params.inventoryId,
        userId: req.user.id,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    emitToInventory(req.params.inventoryId, 'comment:created', comment);
    res.status(201).json({ comment });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: 'Not found' });
    if (comment.userId !== req.user.id && !req.user.isAdmin)
      return res.status(403).json({ error: 'Forbidden' });

    await prisma.comment.delete({ where: { id: req.params.id } });
    emitToInventory(comment.inventoryId, 'comment:deleted', { id: req.params.id }); // ✅
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};