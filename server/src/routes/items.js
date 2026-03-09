const router = require('express').Router();
const ctrl = require('../controllers/itemController');
const { authenticate, requireAuth } = require('../middleware/auth');

router.use(authenticate);

router.get('/my/created', requireAuth, ctrl.myCreated);
router.get('/my/accessible', requireAuth, ctrl.myAccessible);
router.get('/inventory/:inventoryId', ctrl.list);

router.get('/:id', ctrl.get);
router.post('/inventory/:inventoryId', requireAuth, ctrl.create);
router.put('/:id', requireAuth, ctrl.update);
router.delete('/bulk', requireAuth, ctrl.bulkRemove);
router.delete('/:id', requireAuth, ctrl.remove);
router.post('/:id/like', requireAuth, ctrl.like);
router.delete('/:id/like', requireAuth, ctrl.unlike);

module.exports = router;