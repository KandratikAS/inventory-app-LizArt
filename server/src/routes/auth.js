const router = require('express').Router();
const passport = require('passport');
const ctrl = require('../controllers/authController');
const { authenticate, requireAuth } = require('../middleware/auth');

// Local auth
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

// Current user
router.get('/me', authenticate, requireAuth, ctrl.me);
router.put('/me', authenticate, requireAuth, ctrl.updateMe);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  ctrl.oauthCallback
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  ctrl.oauthCallback
);

module.exports = router;