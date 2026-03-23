const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const { authenticate, requireAuth } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', ctrl.getGlobalStats);

router.get('/', ctrl.list);
router.get('/my', requireAuth, ctrl.listMine);
router.get('/accessible', requireAuth, ctrl.listAccessible);
router.get('/categories', ctrl.categories);
router.post('/categories', requireAuth, ctrl.createCategory);
router.delete('/categories/:id', requireAuth, ctrl.deleteCategory);

router.get('/:id', ctrl.get);
router.post('/', requireAuth, ctrl.create);
router.put('/:id', requireAuth, ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

router.get('/:id/access', requireAuth, ctrl.getAccess);
router.post('/:id/access', requireAuth, ctrl.addAccess);
router.delete('/:id/access/:userId', requireAuth, ctrl.removeAccess);

router.get('/:id/stats', ctrl.stats);

const crypto = require('crypto');
const prisma = require('../config/prisma');

router.post('/:id/token', requireAuth, async (req, res) => {
  try {
    const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (inv.ownerId !== req.user.id && !req.user.isAdmin)
      return res.status(403).json({ error: 'Forbidden' });

    const token = crypto.randomBytes(32).toString('hex');
    const updated = await prisma.inventory.update({
      where: { id: req.params.id },
      data: { apiToken: token },
    });
    res.json({ apiToken: updated.apiToken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;