const prisma = require('../config/prisma');


function canWrite(inventory, user) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (inventory.ownerId === user.id) return true;
  if (inventory.isPublic) return true; 
  return (inventory.access || []).some((a) => a.userId === user.id);
}

function canManage(inventory, user) {
  if (!user) return false;
  if (user.isAdmin) return true;
  return inventory.ownerId === user.id;
}


const INCLUDE = {
  owner: { select: { id: true, username: true, avatarUrl: true } },
  category: true,
  tags: { include: { tag: true } },
  fields: { orderBy: { order: 'asc' } },
  access: {
    include: {
      user: { select: { id: true, username: true, email: true, avatarUrl: true } },
    },
  },
  _count: { select: { items: true, comments: true } },
};


exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, tag, sort } = req.query;
    const where = {};

    if (!req.user) {
      where.isPublic = true;
    }
    else if (!req.user.isAdmin) {
      where.OR = [
        { isPublic: true },
        { ownerId: req.user.id },
        { access: { some: { userId: req.user.id } } },
      ];
    }

    if (category) where.categoryId = category;
    if (tag) where.tags = { some: { tag: { name: tag } } };

    const orderBy = sort === 'popular'
      ? { items: { _count: 'desc' } }
      : { lastViewedAt: { sort: 'desc', nulls: 'last' } };

    const [inventories, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: INCLUDE,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy,
      }),
      prisma.inventory.count({ where }),
    ]);

    res.json({ inventories, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    next(e);
  }
};

exports.listMine = async (req, res, next) => {
  try {
    const inventories = await prisma.inventory.findMany({
      where: { ownerId: req.user.id },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ inventories });
  } catch (e) {
    next(e);
  }
};

exports.listAccessible = async (req, res, next) => {
  try {
    const inventories = await prisma.inventory.findMany({
      where: {
        ownerId: { not: req.user.id },
        OR: [
          { isPublic: true },
          { access: { some: { userId: req.user.id } } },
        ],
      },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ inventories });
  } catch (e) {
    next(e);
  }
};

exports.categories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ categories });
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: INCLUDE,
    });
    if (!inventory) return res.status(404).json({ error: 'Not found' });

    if (!inventory.isPublic && !req.user) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!inventory.isPublic && req.user && !req.user.isAdmin &&
        inventory.ownerId !== req.user.id &&
        !(inventory.access || []).some(a => a.userId === req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.inventory.update({
      where: { id: req.params.id },
      data: { lastViewedAt: new Date() },
    });

    res.json({
      inventory,
      writeAccess: canWrite(inventory, req.user),
      manageAccess: canManage(inventory, req.user),
    });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, categoryId, isPublic, tags, fields, customIdFormat, imageUrl } =
      req.body;

    if (!title) return res.status(400).json({ error: 'Title required' });

    const tagConnects = [];
    for (const name of tags || []) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      tagConnects.push({ tagId: tag.id });
    }

    const inventory = await prisma.inventory.create({
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        isPublic: !!isPublic,
        ownerId: (req.user.isAdmin && req.body.ownerId) ? req.body.ownerId : req.user.id,
        categoryId: categoryId || null,
        customIdFormat: customIdFormat || [],
        tags: tagConnects.length ? { create: tagConnects } : undefined,
        fields: (fields || []).length
          ? { create: fields.map((f, i) => ({ ...f, order: i })) }
          : undefined,
      },
      include: INCLUDE,
    });

    res.status(201).json({ inventory });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: INCLUDE,
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!canManage(existing, req.user)) return res.status(403).json({ error: 'Forbidden' });

    const {
      title,
      description,
      categoryId,
      isPublic,
      tags,
      fields,
      customIdFormat,
      imageUrl,
      version,
    } = req.body;

    if (version !== undefined && existing.version !== Number(version)) {
      return res.status(409).json({
        error: 'Version conflict',
        currentVersion: existing.version,
      });
    }

    if (tags !== undefined) {
      await prisma.inventoryTag.deleteMany({ where: { inventoryId: existing.id } });
      for (const name of tags) {
        const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
        await prisma.inventoryTag.create({
          data: { inventoryId: existing.id, tagId: tag.id },
        });
      }
    }

if (fields !== undefined) {
  const existingFieldIds = existing.fields.map(f => f.id);
  const incomingIds = fields.filter(f => f.id).map(f => f.id);
  
  const toDelete = existingFieldIds.filter(id => !incomingIds.includes(id));
  if (toDelete.length) {
    await prisma.inventoryField.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (let i = 0; i < fields.length; i++) {
    const { _tempId, id, ...rest } = fields[i];
    if (id) {
      await prisma.inventoryField.update({
        where: { id },
        data: { ...rest, order: i },
      });
    } else {
      await prisma.inventoryField.create({
        data: { ...rest, inventoryId: existing.id, order: i },
      });
    }
  }
}

    const data = { version: { increment: 1 } };
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (isPublic !== undefined) data.isPublic = !!isPublic;
    if (categoryId !== undefined) data.categoryId = categoryId || null;
    if (customIdFormat !== undefined) data.customIdFormat = customIdFormat;

    const updated = await prisma.inventory.update({
      where: { id: existing.id },
      data,
      include: INCLUDE,
    });

    res.json({ inventory: updated });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: { access: true },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!canManage(existing, req.user)) return res.status(403).json({ error: 'Forbidden' });

    await prisma.inventory.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};


exports.getAccess = async (req, res, next) => {
  try {
    const inv = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: INCLUDE,
    });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (!canManage(inv, req.user)) return res.status(403).json({ error: 'Forbidden' });
    res.json({ access: inv.access });
  } catch (e) {
    next(e);
  }
};

exports.addAccess = async (req, res, next) => {
  try {
    const inv = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: INCLUDE,
    });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (!canManage(inv, req.user)) return res.status(403).json({ error: 'Forbidden' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const access = await prisma.inventoryAccess.upsert({
      where: { inventoryId_userId: { inventoryId: req.params.id, userId } },
      update: {},
      create: { inventoryId: req.params.id, userId },
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true } },
      },
    });
    res.json({ access });
  } catch (e) {
    next(e);
  }
};

exports.removeAccess = async (req, res, next) => {
  try {
    const inv = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: INCLUDE,
    });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (!canManage(inv, req.user)) return res.status(403).json({ error: 'Forbidden' });

    await prisma.inventoryAccess.delete({
      where: {
        inventoryId_userId: {
          inventoryId: req.params.id,
          userId: req.params.userId,
        },
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};


exports.stats = async (req, res, next) => {
  try {
    const inv = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: { fields: true, items: true },
    });
    if (!inv) return res.status(404).json({ error: 'Not found' });

    const stats = {
      totalItems: inv.items.length,
      fields: {},
    };

    for (const field of inv.fields) {
      const values = inv.items
        .map((item) => item.fieldValues?.[field.id])
        .filter((v) => v !== undefined && v !== null && v !== '');

    if (field.fieldType === 'number') {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      const sum = nums.reduce((a, b) => a + b, 0);
      stats.fields[field.label] = {
      type: 'number',
      count: nums.length,
      sum: sum,
      avg: nums.length ? (sum / nums.length).toFixed(2) : null,
      min: nums.length ? Math.min(...nums) : null,
      max: nums.length ? Math.max(...nums) : null,
    };
      } else if (field.fieldType === 'text_single') {
        const freq = {};
        values.forEach((v) => {
          freq[v] = (freq[v] || 0) + 1;
        });
        const topValues = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        stats.fields[field.label] = { type: 'text', topValues };
      } else if (field.fieldType === 'boolean') {
        const trueCount = values.filter(Boolean).length;
        stats.fields[field.label] = {
          type: 'boolean',
          trueCount,
          falseCount: values.length - trueCount,
        };
      }
    }

    res.json({ stats });
  } catch (e) {
    next(e);
  }
};
  exports.getGlobalStats = async (req, res, next) => {
try {
const [totalInventories, totalItems, activeUsers] = await Promise.all([
prisma.inventory.count(),
prisma.item.count(),
prisma.user.count(),
]);
res.json({ totalInventories, totalItems, activeUsers });
} catch (e) { next(e); }
};
exports.createCategory = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json({ category });
  } catch (e) { next(e); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
};