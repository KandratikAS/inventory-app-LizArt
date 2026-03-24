const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const { authenticate, requireAuth } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', ctrl.getGlobalStats);
router.get('/categories', ctrl.categories);
router.post('/categories', requireAuth, ctrl.createCategory);
router.delete('/categories/:id', requireAuth, ctrl.deleteCategory);

router.get('/', ctrl.list);
router.get('/my', requireAuth, ctrl.listMine);
router.get('/accessible', requireAuth, ctrl.listAccessible);

router.get('/:id', ctrl.get);
router.post('/', requireAuth, ctrl.create);
router.put('/:id', requireAuth, ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

router.get('/:id/access', requireAuth, ctrl.getAccess);
router.post('/:id/access', requireAuth, ctrl.addAccess);
router.delete('/:id/access/:userId', requireAuth, ctrl.removeAccess);

router.get('/:id/stats', ctrl.stats);
router.post('/:id/token', requireAuth, ctrl.generateToken);
router.post('/:id/sync', requireAuth, ctrl.syncToOdoo);

module.exports = router;