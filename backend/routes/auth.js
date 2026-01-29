const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
  verifyEmail,
  validatePassword,
  getActiveSessions,
  logoutAllSessions
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/advancedSecurity');

// Use the dynamic limiter for all auth routes for security
router.post('/register', dynamicRateLimiter, register);
router.post('/login', dynamicRateLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Password Management
router.post('/forgot-password', dynamicRateLimiter, forgotPassword);
router.post('/verify-otp', dynamicRateLimiter, verifyOTP);
router.post('/reset-password', dynamicRateLimiter, resetPassword);

// Email Verification
router.get('/verify-email', verifyEmail);
router.post('/validate-password', dynamicRateLimiter, validatePassword);

router.get('/sessions', getActiveSessions);
router.post('/logout-all', logoutAllSessions);
module.exports = router;