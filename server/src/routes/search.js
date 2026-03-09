const router = require('express').Router();
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    if (!q.trim()) return res.json({ inventories: [], items: [], query: q });

    const offset = (Number(page) - 1) * Number(limit);
    const userId = req.user?.id || null;

    const inventories = await prisma.$queryRaw`
      SELECT
        i.id,
        i.title,
        i.description,
        i."imageUrl",
        i."isPublic",
        i."createdAt",
        u.username    AS "ownerUsername",
        u."avatarUrl" AS "ownerAvatar",
        u.id          AS "ownerId"
      FROM "Inventory" i
      LEFT JOIN "User" u ON u.id = i."ownerId"
      WHERE (i."isPublic" = true OR i."ownerId" = ${userId})
        AND (
          i.title       ILIKE ${'%' + q + '%'}
          OR i.description ILIKE ${'%' + q + '%'}
        )
      ORDER BY i."createdAt" DESC
      LIMIT ${Number(limit)}
      OFFSET ${offset}
    `;

    const inventoryIds = inventories.map(i => i.id);

    const items = await prisma.$queryRaw`
      SELECT
        it.id,
        it."customId",
        it."fieldValues",
        it."inventoryId",
        it."createdAt",
        it.name         AS "itemName",
        inv.title       AS "inventoryTitle"
      FROM "Item" it
      LEFT JOIN "Inventory" inv ON inv.id = it."inventoryId"
      WHERE (inv."isPublic" = true OR inv."ownerId" = ${userId})
        AND (
          it."customId"          ILIKE ${'%' + q + '%'}
          OR it.name             ILIKE ${'%' + q + '%'}
          OR it."fieldValues"::text ILIKE ${'%' + q + '%'}
        )
      ORDER BY it."createdAt" DESC
      LIMIT ${Number(limit)}
    `;

    res.json({ inventories, items, query: q });
  } catch (e) {
    next(e);
  }
});

module.exports = router;