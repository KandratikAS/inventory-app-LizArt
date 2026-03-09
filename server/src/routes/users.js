const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, requireAuth, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// Public-ish
router.get('/search', requireAuth, ctrl.search);
router.get('/tags', ctrl.tags);
router.get('/:id/profile', ctrl.getProfile);

// Admin-only
router.get('/', requireAdmin, ctrl.listAll);
router.put('/:id/block', requireAdmin, ctrl.block);
router.put('/:id/unblock', requireAdmin, ctrl.unblock);
router.delete('/:id', requireAdmin, ctrl.remove);
router.put('/:id/admin', requireAdmin, ctrl.setAdmin);

module.exports = router;