const router = require('express').Router();
const ctrl = require('../controllers/commentController');
const { authenticate, requireAuth } = require('../middleware/auth');

router.use(authenticate);
router.get('/inventory/:inventoryId', ctrl.list);
router.post('/inventory/:inventoryId', requireAuth, ctrl.create);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;