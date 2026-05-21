const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const AchievementController = require('../controllers/AchievementController');
const auth = require('../middleware/auth');
const passport = require('../config/passport');
const AuthService = require('../services/AuthService');
const { getClientUrl } = require('../utils/urls');

// Auth routes
router.post('/register/send-otp', AuthController.sendOTP);
router.post('/register/verify-otp', AuthController.verifyOTP);
router.post('/register/resend-otp', AuthController.sendOTP);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

const { upload } = require('../config/cloudinary');

// Profile routes
router.get('/stats', auth, AuthController.getStats);
router.get('/me', auth, AuthController.getProfile);
router.get('/me/achievements', auth, AchievementController.getAll);
router.put('/profile', auth, upload.single('avatar'), AuthController.updateProfile);
router.get('/profile', auth, AuthController.getProfile);

// Param-based routes (matched last to avoid hijacking static paths)
router.get('/:id/achievements', auth, AchievementController.getAll);
router.get('/:id/stats', auth, AuthController.getStats);
router.get('/:id', auth, AuthController.getProfile);

// OAuth (Keep these in routes as they are mostly config-driven)
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    try {
        if (!req.user) {
            return res.redirect(`${getClientUrl()}/login?error=OAuthFailed`);
        }
        const token = AuthService.generateToken(req.user);
        res.redirect(`${getClientUrl()}/auth/callback?token=${token}`);
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect(`${getClientUrl()}/login?error=ServerError`);
    }
});

router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/auth/github/callback', passport.authenticate('github', { session: false }), (req, res) => {
    try {
        if (!req.user) {
            return res.redirect(`${getClientUrl()}/login?error=OAuthFailed`);
        }
        const token = AuthService.generateToken(req.user);
        res.redirect(`${getClientUrl()}/auth/callback?token=${token}`);
    } catch (error) {
        console.error('GitHub OAuth callback error:', error);
        res.redirect(`${getClientUrl()}/login?error=ServerError`);
    }
});

module.exports = router;
