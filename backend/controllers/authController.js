




const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const Session = require('../models/Session');
const { validatePassword, isCommonPassword } = require('../utils/passwordValidator');
const { verifyToken: verifyTOTP } = require('../utils/totp');
const { logSecurityEvent } = require('../utils/logger');
const { sendVerificationEmail, sendOTPEmail } = require('../utils/email');
const { verifyRecaptcha } = require('../utils/googleRecaptcha');
const { JWTBlacklist } = require('../middleware/advancedSecurity');
const { generateOTP, storeOTP, verifyOTP: verifyOTPUtils } = require('../utils/otp');

// 🛡️ SECURITY CONSTANTS
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;

// 🔧 FIX: Cookie duration - 7 days instead of 15 minutes
const COOKIE_EXPIRES = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_EXPIRES = '7d'; // Match cookie expiry

// 🛡️ INPUT SANITIZATION
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase().substring(0, MAX_EMAIL_LENGTH);
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(cleaned) ? cleaned : null;
};

const sanitizeString = (str, maxLength) => {
  if (!str || typeof str !== 'string') return null;
  return str.trim().substring(0, maxLength).replace(/[<>]/g, '');
};

const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/[^\d+\-() ]/g, '').substring(0, MAX_PHONE_LENGTH);
  return cleaned.length >= 10 ? cleaned : null;
};

// 🛡️ RATE LIMITING HELPER
const rateLimitMap = new Map();
const checkRateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const userAttempts = rateLimitMap.get(identifier) || [];

  const recentAttempts = userAttempts.filter(time => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return false;
  }

  recentAttempts.push(now);
  rateLimitMap.set(identifier, recentAttempts);
  return true;
};

// 🔧 FIX: SECURE TOKEN RESPONSE with longer expiry
const sendTokenResponse = (user, token, res, jti) => {
  const options = {
    expires: new Date(Date.now() + COOKIE_EXPIRES),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };

  res.cookie('token', token, options);

  // 🔧 FIX: Get decrypted phone properly
  let decryptedPhone = null;
  if (user.phone) {
    try {
      const { decrypt } = require('../utils/encryption');
      decryptedPhone = decrypt(user.phone);
    } catch (e) {
      console.error('Phone decryption error:', e.message);
      decryptedPhone = null;
    }
  }

  res.status(200).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: decryptedPhone, // 🔧 FIX: Send decrypted phone
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled || false,
        isEmailVerified: user.isEmailVerified || false
      }
    }
  });
};

// ==========================================
// REGISTER - FULL SECURITY
// ==========================================
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, recaptchaToken } = req.body;

    // 1. RATE LIMITING
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`register_${clientIp}`, 3, 60 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Too many registration attempts. Try again later.'
      });
    }

    // 2. RECAPTCHA (Production only)
    if (process.env.NODE_ENV === 'production') {
      if (!recaptchaToken) {
        return res.status(400).json({
          success: false,
          message: 'Security verification required'
        });
      }
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
        logSecurityEvent('RECAPTCHA_FAILED', { ip: clientIp });
        return res.status(400).json({
          success: false,
          message: 'Security check failed'
        });
      }
    }

    // 3. INPUT VALIDATION & SANITIZATION
    const cleanEmail = sanitizeEmail(email);
    const cleanName = sanitizeString(name, MAX_NAME_LENGTH);
    const cleanPhone = sanitizePhone(phone);

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters'
      });
    }

    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number'
      });
    }

    // 4. PASSWORD SECURITY
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) {
      logSecurityEvent('WEAK_PASSWORD', { email: cleanEmail, ip: clientIp });
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: pwdCheck.errors
      });
    }

    if (isCommonPassword(password)) {
      logSecurityEvent('COMMON_PASSWORD', { email: cleanEmail, ip: clientIp });
      return res.status(400).json({
        success: false,
        message: 'Password is too common. Choose a stronger password.'
      });
    }

    // 5. DUPLICATE CHECK
    const exists = await User.findOne({ email: cleanEmail }).select('_id');
    if (exists) {
      logSecurityEvent('DUPLICATE_REGISTRATION', { email: cleanEmail, ip: clientIp });
      // Don't reveal user exists - timing attack prevention
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
      return res.status(400).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }

    // 6. EMAIL VERIFICATION TOKEN
    const emailToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(emailToken).digest('hex');

    // 7. CREATE USER (Phone will be encrypted automatically by model)
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password, // Will be hashed by model pre-save hook
      phone: cleanPhone, // Will be encrypted by model setter
      emailVerificationToken: hashedToken,
      emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000,
      registrationIp: clientIp
    });

    // 8. SEND VERIFICATION EMAIL (Non-blocking)
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${emailToken}`;
    try {
      await sendVerificationEmail(user.email, verifyUrl);
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      // Don't fail registration if email fails
    }

    // 9. GENERATE JWT with 7 days expiry
    const jti = crypto.randomUUID();
    const token = generateToken(user._id, jti, TOKEN_EXPIRES);

    logSecurityEvent('USER_REGISTERED', {
      userId: user._id,
      email: user.email,
      ip: clientIp
    });

    sendTokenResponse(user, token, res, jti);

  } catch (error) {
    console.error('Registration error:', error);
    logSecurityEvent('REGISTRATION_ERROR', {
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

// ==========================================
// LOGIN - FULL SECURITY WITH MONGODB SESSION MANAGEMENT
// ==========================================
exports.login = async (req, res) => {
  try {
    const { email, password, totpCode, recaptchaToken } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // 1. INPUT VALIDATION
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    // 2. RATE LIMITING (Per IP)
    if (!checkRateLimit(`login_${clientIp}`, 10, 1 * 60 * 1000)) {
      logSecurityEvent('LOGIN_RATE_LIMIT', { ip: clientIp });
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Try again in 15 minutes.'
      });
    }

    // 3. FETCH USER
    const user = await User.findOne({ email: cleanEmail })
      .select('+password +twoFactorSecret +twoFactorBackupCodes +loginAttempts +lockUntil +twoFactorEnabled');

    if (!user) {
      // Timing attack prevention
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
      logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', { email: cleanEmail, ip: clientIp });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 4. ACCOUNT LOCK CHECK
    if (user.isLocked && user.isLocked()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      logSecurityEvent('LOGIN_ATTEMPT_LOCKED', {
        userId: user._id,
        ip: clientIp,
        remainingMinutes: mins
      });
      return res.status(423).json({
        success: false,
        message: `Account locked due to multiple failed attempts. Try again in ${mins} minute(s).`
      });
    }

    // 5. RECAPTCHA (if attempts >= 3)
    if (user.loginAttempts >= 3 && !totpCode) {
      if (!recaptchaToken) {
        return res.status(400).json({
          success: false,
          message: 'Security verification required',
          requiresRecaptcha: true
        });
      }
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Security check failed',
          requiresRecaptcha: true
        });
      }
    }

    // 6. PASSWORD VERIFICATION
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      logSecurityEvent('LOGIN_FAILED_PASSWORD', {
        userId: user._id,
        attempts: user.loginAttempts + 1,
        ip: clientIp
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1)
      });
    }

    // 7. EMAIL VERIFICATION CHECK
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // 8. TWO-FACTOR AUTHENTICATION
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return res.status(200).json({
          success: false,
          requires2FA: true,
          message: 'Enter your 2FA code'
        });
      }

      const validTotp = verifyTOTP(totpCode, user.twoFactorSecret);
      if (!validTotp) {
        await user.incLoginAttempts();
        logSecurityEvent('LOGIN_FAILED_2FA', {
          userId: user._id,
          ip: clientIp
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }
    }

    // 9. SUCCESS - RESET ATTEMPTS & CREATE SESSION IN MONGODB
    await user.resetLoginAttempts();

    // ✅ Generate tokens and session ID
    const jti = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const token = generateToken(user._id, jti, TOKEN_EXPIRES);

    const expiresAt = new Date(Date.now() + COOKIE_EXPIRES);

    try {
      // ✅ Create session in MongoDB
      await Session.create({
        sessionId,
        userId: user._id,
        token: jti,
        deviceInfo: req.get('user-agent') || 'Unknown Device',
        ipAddress: clientIp,
        userAgent: req.get('user-agent') || 'Unknown',
        lastActivity: new Date(),
        expiresAt
      });

      // ✅ Enforce max sessions per user
      const sessions = await Session.find({ userId: user._id })
        .sort({ lastActivity: -1 });

      if (sessions.length > (user.maxSessions || 3)) {
        // Delete oldest sessions
        const toDelete = sessions.slice(user.maxSessions || 3);
        await Session.deleteMany({
          _id: { $in: toDelete.map(s => s._id) }
        });

        logSecurityEvent('MAX_SESSIONS_EXCEEDED', {
          userId: user._id,
          deletedCount: toDelete.length
        });
      }

    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      // Continue with login even if session creation fails (fallback)
    }

    // ✅ Update user login info
    await User.findByIdAndUpdate(user._id, {
      $set: {
        lastLogin: new Date(),
        lastLoginIP: clientIp
      }
    });

    logSecurityEvent('LOGIN_SUCCESS', {
      userId: user._id,
      ip: clientIp,
      sessionId
    });

    sendTokenResponse(user, token, res, jti);

  } catch (error) {
    console.error('Login error:', error);
    logSecurityEvent('LOGIN_ERROR', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};


exports.logout = async (req, res) => {
  try {
    if (req.user && req.jti) {
      // ✅ 1. Add JWT to blacklist (in-memory + MongoDB)
      await JWTBlacklist.add(req.jti, COOKIE_EXPIRES / 1000);

      // ✅ 2. Remove session from MongoDB
      const deletedSession = await Session.findOneAndDelete({ token: req.jti });

      if (deletedSession) {
        logSecurityEvent('SESSION_DELETED', {
          userId: req.user._id,
          sessionId: deletedSession.sessionId,
          ip: req.ip
        });
      }
    }

    // ✅ 3. Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    logSecurityEvent('USER_LOGOUT', {
      userId: req.user?._id,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    logSecurityEvent('LOGOUT_ERROR', {
      userId: req.user?._id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};








// ==========================================
// LOGOUT ALL SESSIONS (Security Feature)
// ==========================================
exports.logoutAllSessions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    const result = await Session.deleteMany({ userId: req.user._id });

    logSecurityEvent('LOGOUT_ALL_SESSIONS', {
      userId: req.user._id,
      deletedCount: result.deletedCount,
      ip: req.ip
    });
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(200).json({
      success: true,
      message: `Logged out from ${result.deletedCount} device(s)`,
      count: result.deletedCount
    });

  } catch (error) {
    console.error('Logout all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout all sessions'
    });
  }
};

// ==========================================
// GET ACTIVE SESSIONS (Security Feature)
// ==========================================
exports.getActiveSessions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const sessions = await Session.find({ userId: req.user._id })
      .select('sessionId deviceInfo ipAddress lastActivity createdAt expiresAt')
      .sort({ lastActivity: -1 })
      .lean();

    // ✅ Mark current session
    const currentSessions = sessions.map(session => ({
      ...session,
      isCurrent: session.token === req.jti
    }));

    res.status(200).json({
      success: true,
      data: {
        sessions: currentSessions,
        count: sessions.length,
        maxAllowed: req.user.maxSessions || 3
      }
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
    });
  }
};

// ==========================================
// FORGOT PASSWORD - SECURE
// ==========================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const rateLimitKey = `forgot_pwd:${clientIp}:${email}`;


    try {
      const attempts = await redis.incr(rateLimitKey);
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 3600); // 1 hour window
      }

      if (attempts > 3) {
        logSecurityEvent('PASSWORD_RESET_RATE_LIMIT', { email, ip: clientIp });
        return res.status(429).json({
          success: false,
          message: 'Too many password reset attempts. Try again in 1 hour.'
        });
      }
    } catch (redisError) {
      // Fallback to existing in-memory rate limiting
      if (!checkRateLimit(`forgot_${clientIp}`, 3, 60 * 60 * 1000)) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Try again later.'
        });
      }
    }



    // Rate limiting
    if (!checkRateLimit(`forgot_${clientIp}`, 3, 60 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Try again later.'
      });
    }

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Valid email required'
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    // Always return success (prevent user enumeration)
    const genericResponse = {
      success: true,
      message: 'If an account exists, a reset code has been sent.'
    };

    if (!user) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
      return res.status(200).json(genericResponse);
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Generate OTP
    const otp = generateOTP();
    storeOTP(cleanEmail, otp);

    // Send email
    try {
      await sendOTPEmail(cleanEmail, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    logSecurityEvent('PASSWORD_RESET_REQUESTED', {
      userId: user._id,
      ip: clientIp
    });

    res.status(200).json(genericResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Request failed. Try again.'
    });
  }
};

// ==========================================
// VERIFY OTP - SECURE
// ==========================================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP required'
      });
    }

    // Rate limiting
    if (!checkRateLimit(`otp_${cleanEmail}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Try again later.'
      });
    }

    const otpResult = verifyOTPUtils(cleanEmail, otp);
    if (!otpResult.valid) {
      logSecurityEvent('OTP_VERIFICATION_FAILED', {
        email: cleanEmail,
        ip: clientIp
      });
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    logSecurityEvent('OTP_VERIFIED', { userId: user._id, ip: clientIp });

    res.status(200).json({
      success: true,
      data: { resetToken }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
};

// ==========================================
// RESET PASSWORD - SECURE
// ==========================================
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!resetToken || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password required'
      });
    }
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+passwordHistory');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: pwdCheck.errors
      });
    }

    if (isCommonPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password is too common'
      });
    }
    if (user.isPasswordInHistory && await user.isPasswordInHistory(password)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reuse recent passwords'
      });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.activeSessions = [];
    await user.save();
    logSecurityEvent('PASSWORD_RESET_SUCCESS', {
      userId: user._id,
      ip: clientIp
    });
    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};

// ==========================================
// VERIFY EMAIL - SECURE
// ==========================================
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token required'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    logSecurityEvent('EMAIL_VERIFIED', {
      userId: user._id,
      email: user.email
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
};

// ==========================================
// GET ME - SECURE WITH DECRYPTED PHONE
// ==========================================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -passwordHistory');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 🔧 FIX: Properly decrypt phone before sending
    const userData = user.toObject();

    // Additional explicit decryption if needed
    if (userData.phone) {
      try {
        const { decrypt } = require('../utils/encryption');
        userData.phone = decrypt(userData.phone);
      } catch (e) {
        console.error('Phone decryption error in getMe:', e.message);
        userData.phone = null;
      }
    }

    res.status(200).json({
      success: true,
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
    });
  }
};

exports.validatePassword = async (req, res) => {
  try {
    const { password } = req.body;

    const validation = validatePassword(password);
    const isCommon = isCommonPassword(password);

    if (isCommon) {
      validation.isValid = false;
      validation.errors.push('Password is too common');
    }

    res.json({ success: true, data: validation });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation failed' });
  }
};