const router = require('express').Router();
const { upload } = require('../config/cloudinary');
const { authenticate, requireAuth } = require('../middleware/auth');

router.use(authenticate, requireAuth);

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: req.file.path });
});

module.exports = router;