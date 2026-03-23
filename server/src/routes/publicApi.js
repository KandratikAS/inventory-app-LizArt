const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

router.get('/:token', async (req, res) => {
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { apiToken: req.params.token },
      include: {
        fields: true,
        items: true,
        owner: { select: { username: true } },
      },
    });

    if (!inventory) return res.status(404).json({ error: 'Not found' });

    const stats = {};
    for (const field of inventory.fields) {
      const values = inventory.items
        .map(i => i.fieldValues?.[field.id])
        .filter(v => v !== null && v !== undefined && v !== '');

      if (field.fieldType === 'number') {
        const nums = values.map(Number).filter(n => !isNaN(n));
        stats[field.label] = {
          type: 'number',
          count: nums.length,
          avg: nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : null,
          min: nums.length ? Math.min(...nums) : null,
          max: nums.length ? Math.max(...nums) : null,
          sum: nums.length ? nums.reduce((a, b) => a + b, 0) : null,
        };
      } else if (field.fieldType === 'text_single' || field.fieldType === 'text_multi') {
        const freq = {};
        values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
        const topValues = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        stats[field.label] = { type: 'text', count: values.length, topValues };
      } else if (field.fieldType === 'boolean') {
        const trueCount = values.filter(v => v === true || v === 'true').length;
        stats[field.label] = {
          type: 'boolean',
          trueCount,
          falseCount: values.length - trueCount,
        };
      }
    }

    res.json({
      id: inventory.id,
      title: inventory.title,
      description: inventory.description,
      owner: inventory.owner.username,
      totalItems: inventory.items.length,
      createdAt: inventory.createdAt,
      fields: inventory.fields.map(f => ({ id: f.id, label: f.label, type: f.fieldType })),
      stats,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;