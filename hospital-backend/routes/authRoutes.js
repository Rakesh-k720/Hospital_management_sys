const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTPLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// 2FA management (protected)
router.post('/enable-2fa', protect, authController.enable2FA);
router.post('/disable-2fa', protect, authController.disable2FA);
router.get('/2fa-status', protect, authController.get2FAStatus);

module.exports = router;
