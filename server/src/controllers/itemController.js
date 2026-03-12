const prisma = require('../config/prisma');
const { generateCustomId } = require('../utils/customId');
const { emitToInventory } = require('../utils/socket');



async function getWriteAccess(inventoryId, user) {
  if (!user) return false;
  const inv = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { access: true },
  });
  if (!inv) return false;
  if (user.isAdmin) return true;
  if (inv.isPublic) return true;
  if (inv.ownerId === user.id) return true;
  return inv.access.some((a) => a.userId === user.id);
}

const ITEM_INCLUDE = {
  createdBy: { select: { id: true, username: true, avatarUrl: true } },
  _count: { select: { likes: true } },
};


exports.list = async (req, res, next) => {
  try {
    const { inventoryId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where: { inventoryId },
        include: {
          ...ITEM_INCLUDE,
          ...(req.user
            ? { likes: { where: { userId: req.user.id }, select: { userId: true } } }
            : {}),
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where: { inventoryId } }),
    ]);

    res.json({ items, total });
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        ...ITEM_INCLUDE,
        inventory: {
          include: { fields: { orderBy: { order: 'asc' } } },
        },
        ...(req.user
          ? { likes: { where: { userId: req.user.id }, select: { userId: true } } }
          : {}),
      },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { inventoryId } = req.params;

    if (!(await getWriteAccess(inventoryId, req.user)))
      return res.status(403).json({ error: 'Forbidden' });

    const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    if (!inv) return res.status(404).json({ error: 'Inventory not found' });

    const { fieldValues, customId: providedId } = req.body;

    const count = await prisma.item.count({ where: { inventoryId } });

    let customId = providedId;
    if (!customId) {
      let seqVal = count + 1;
      let attempts = 0;
      while (attempts < 100) {
        customId = generateCustomId(inv.customIdFormat, seqVal);
        const conflict = await prisma.item.findUnique({
          where: { inventoryId_customId: { inventoryId, customId } },
        });
        if (!conflict) break;
        seqVal++;
        attempts++;
      }
    } else {
      const conflict = await prisma.item.findUnique({
        where: { inventoryId_customId: { inventoryId, customId } },
      });
      if (conflict)
        return res.status(409).json({ error: 'Custom ID already exists', field: 'customId' });
    }

    const titleField = await prisma.inventoryField.findFirst({
      where: { inventoryId, label: 'Title' }
    });

    const finalFieldValues = { ...fieldValues };
    if (titleField && req.body.name && !finalFieldValues[titleField.id]) {
      finalFieldValues[titleField.id] = req.body.name;
    }

    const item = await prisma.item.create({
      data: {
        inventoryId,
        customId,
        createdById: req.user.id,
        name: req.body.name || '',
        fieldValues: finalFieldValues,
      },
      include: ITEM_INCLUDE,
    });

    emitToInventory(inventoryId, 'item:created', item);
    res.status(201).json({ item });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { inventory: { include: { access: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (!(await getWriteAccess(existing.inventoryId, req.user)))
      return res.status(403).json({ error: 'Forbidden' });

    const isInventoryOwner = existing.inventory.ownerId === req.user.id;
    if (!req.user.isAdmin && !isInventoryOwner && existing.createdById !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { fieldValues, customId, version } = req.body;

    if (version !== undefined && existing.version !== Number(version)) {
      return res.status(409).json({
        error: 'Version conflict',
        currentVersion: existing.version,
      });
    }

    if (customId && customId !== existing.customId) {
      const conflict = await prisma.item.findFirst({
        where: {
          inventoryId: existing.inventoryId,
          customId,
          id: { not: existing.id },
        },
      });
      if (conflict)
        return res.status(409).json({ error: 'Custom ID already exists', field: 'customId' });
    }

    const updated = await prisma.item.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(fieldValues !== undefined && { fieldValues }),
        ...(customId !== undefined && { customId }),
        version: { increment: 1 },
      },
      include: ITEM_INCLUDE,
    });

    emitToInventory(existing.inventoryId, 'item:updated', updated);
    res.json({ item: updated });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { inventory: true },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (!(await getWriteAccess(existing.inventoryId, req.user)))
      return res.status(403).json({ error: 'Forbidden' });

    const isInventoryOwner = existing.inventory.ownerId === req.user.id;
    if (!req.user.isAdmin && !isInventoryOwner && existing.createdById !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    await prisma.item.delete({ where: { id: req.params.id } });
    emitToInventory(existing.inventoryId, 'item:deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

exports.like = async (req, res, next) => {
  try {
    await prisma.like.upsert({
      where: { itemId_userId: { itemId: req.params.id, userId: req.user.id } },
      update: {},
      create: { itemId: req.params.id, userId: req.user.id },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

exports.unlike = async (req, res, next) => {
  try {
    await prisma.like.delete({
      where: { itemId_userId: { itemId: req.params.id, userId: req.user.id } },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

exports.myCreated = async (req, res, next) => {
  try {
    const items = await prisma.item.findMany({
      where: { createdById: req.user.id },
      include: {
        ...ITEM_INCLUDE,
        inventory: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (e) { next(e); }
};

exports.myAccessible = async (req, res, next) => {
  try {
    const accessList = await prisma.inventoryAccess.findMany({
      where: { userId: req.user.id },
      select: { inventoryId: true },
    });
    const inventoryIds = accessList.map(a => a.inventoryId);

    const items = await prisma.item.findMany({
      where: { inventoryId: { in: inventoryIds } },
      include: {
        ...ITEM_INCLUDE,
        inventory: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (e) { next(e); }
};

exports.bulkRemove = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return res.status(400).json({ error: 'ids required' });

    const items = await prisma.item.findMany({
      where: { id: { in: ids } },
      select: { inventoryId: true, createdById: true, inventory: { select: { ownerId: true } } },
    });

    for (const item of items) {
      if (!(await getWriteAccess(item.inventoryId, req.user)))
        return res.status(403).json({ error: 'Forbidden' });

      const isInventoryOwner = item.inventory.ownerId === req.user.id;
      if (!req.user.isAdmin && !isInventoryOwner && item.createdById !== req.user.id)
        return res.status(403).json({ error: 'Forbidden' });
    }

    const inventoryIds = [...new Set(items.map(i => i.inventoryId))];

    await prisma.item.deleteMany({ where: { id: { in: ids } } });

    for (const id of ids) {
      emitToInventory(inventoryIds[0], 'item:deleted', { id });
    }

    res.json({ ok: true, deleted: ids.length });
  } catch (e) {
    next(e);
  }
};