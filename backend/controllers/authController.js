




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
<<<<<<< HEAD

  const recentAttempts = userAttempts.filter(time => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return false;
  }

=======
  
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false;
  }
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
  recentAttempts.push(now);
  rateLimitMap.set(identifier, recentAttempts);
  return true;
};

// 🔧 FIX: SECURE TOKEN RESPONSE with longer expiry
const sendTokenResponse = (user, token, res, jti) => {
  const options = {
    expires: new Date(Date.now() + COOKIE_EXPIRES),
    httpOnly: true,
<<<<<<< HEAD
    secure: process.env.NODE_ENV === 'production',
=======
    secure: process.env.NODE_ENV === 'development',
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    sameSite: 'strict',
    path: '/'
  };

  res.cookie('token', token, options);
<<<<<<< HEAD

=======
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD
      return res.status(429).json({
        success: false,
        message: 'Too many registration attempts. Try again later.'
=======
      return res.status(429).json({ 
        success: false, 
        message: 'Too many registration attempts. Try again later.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 2. RECAPTCHA (Production only)
    if (process.env.NODE_ENV === 'production') {
      if (!recaptchaToken) {
<<<<<<< HEAD
        return res.status(400).json({
          success: false,
          message: 'Security verification required'
=======
        return res.status(400).json({ 
          success: false, 
          message: 'Security verification required' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
        logSecurityEvent('RECAPTCHA_FAILED', { ip: clientIp });
<<<<<<< HEAD
        return res.status(400).json({
          success: false,
          message: 'Security check failed'
=======
        return res.status(400).json({ 
          success: false, 
          message: 'Security check failed' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }
    }

    // 3. INPUT VALIDATION & SANITIZATION
    const cleanEmail = sanitizeEmail(email);
    const cleanName = sanitizeString(name, MAX_NAME_LENGTH);
    const cleanPhone = sanitizePhone(phone);

    if (!cleanEmail) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    if (!cleanName || cleanName.length < 2) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Name must be at least 2 characters' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    if (!cleanPhone) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 4. PASSWORD SECURITY
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) {
      logSecurityEvent('WEAK_PASSWORD', { email: cleanEmail, ip: clientIp });
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: pwdCheck.errors
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Password does not meet security requirements',
        errors: pwdCheck.errors 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    if (isCommonPassword(password)) {
      logSecurityEvent('COMMON_PASSWORD', { email: cleanEmail, ip: clientIp });
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Password is too common. Choose a stronger password.'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Password is too common. Choose a stronger password.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 5. DUPLICATE CHECK
    const exists = await User.findOne({ email: cleanEmail }).select('_id');
    if (exists) {
      logSecurityEvent('DUPLICATE_REGISTRATION', { email: cleanEmail, ip: clientIp });
      // Don't reveal user exists - timing attack prevention
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Registration failed. Please try again.'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Registration failed. Please try again.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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

<<<<<<< HEAD
    logSecurityEvent('USER_REGISTERED', {
      userId: user._id,
      email: user.email,
      ip: clientIp
=======
    logSecurityEvent('USER_REGISTERED', { 
      userId: user._id, 
      email: user.email, 
      ip: clientIp 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    });

    sendTokenResponse(user, token, res, jti);

  } catch (error) {
    console.error('Registration error:', error);
<<<<<<< HEAD
    logSecurityEvent('REGISTRATION_ERROR', {
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
=======
    logSecurityEvent('REGISTRATION_ERROR', { 
      error: error.message, 
      ip: req.ip 
    });
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 2. RATE LIMITING (Per IP)
    if (!checkRateLimit(`login_${clientIp}`, 10, 1 * 60 * 1000)) {
      logSecurityEvent('LOGIN_RATE_LIMIT', { ip: clientIp });
<<<<<<< HEAD
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Try again in 15 minutes.'
=======
      return res.status(429).json({ 
        success: false, 
        message: 'Too many login attempts. Try again in 15 minutes.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 3. FETCH USER
    const user = await User.findOne({ email: cleanEmail })
      .select('+password +twoFactorSecret +twoFactorBackupCodes +loginAttempts +lockUntil +twoFactorEnabled');

    if (!user) {
      // Timing attack prevention
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
      logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', { email: cleanEmail, ip: clientIp });
<<<<<<< HEAD
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
=======
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 4. ACCOUNT LOCK CHECK
    if (user.isLocked && user.isLocked()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
<<<<<<< HEAD
      logSecurityEvent('LOGIN_ATTEMPT_LOCKED', {
        userId: user._id,
        ip: clientIp,
        remainingMinutes: mins
      });
      return res.status(423).json({
        success: false,
        message: `Account locked due to multiple failed attempts. Try again in ${mins} minute(s).`
=======
      logSecurityEvent('LOGIN_ATTEMPT_LOCKED', { 
        userId: user._id, 
        ip: clientIp, 
        remainingMinutes: mins 
      });
      return res.status(423).json({ 
        success: false, 
        message: `Account locked due to multiple failed attempts. Try again in ${mins} minute(s).` 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 5. RECAPTCHA (if attempts >= 3)
    if (user.loginAttempts >= 3 && !totpCode) {
      if (!recaptchaToken) {
<<<<<<< HEAD
        return res.status(400).json({
          success: false,
          message: 'Security verification required',
          requiresRecaptcha: true
=======
        return res.status(400).json({ 
          success: false, 
          message: 'Security verification required',
          requiresRecaptcha: true 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
<<<<<<< HEAD
        return res.status(400).json({
          success: false,
          message: 'Security check failed',
          requiresRecaptcha: true
=======
        return res.status(400).json({ 
          success: false, 
          message: 'Security check failed',
          requiresRecaptcha: true 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }
    }

    // 6. PASSWORD VERIFICATION
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
<<<<<<< HEAD
      logSecurityEvent('LOGIN_FAILED_PASSWORD', {
        userId: user._id,
        attempts: user.loginAttempts + 1,
        ip: clientIp
      });
      return res.status(401).json({
        success: false,
=======
      logSecurityEvent('LOGIN_FAILED_PASSWORD', { 
        userId: user._id, 
        attempts: user.loginAttempts + 1, 
        ip: clientIp 
      });
      return res.status(401).json({ 
        success: false, 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        message: 'Invalid credentials',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1)
      });
    }

    // 7. EMAIL VERIFICATION CHECK
    if (!user.isEmailVerified) {
<<<<<<< HEAD
      return res.status(403).json({
        success: false,
=======
      return res.status(403).json({ 
        success: false, 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // 8. TWO-FACTOR AUTHENTICATION
    if (user.twoFactorEnabled) {
      if (!totpCode) {
<<<<<<< HEAD
        return res.status(200).json({
          success: false,
          requires2FA: true,
          message: 'Enter your 2FA code'
=======
        return res.status(200).json({ 
          success: false, 
          requires2FA: true,
          message: 'Enter your 2FA code' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }

      const validTotp = verifyTOTP(totpCode, user.twoFactorSecret);
      if (!validTotp) {
        await user.incLoginAttempts();
<<<<<<< HEAD
        logSecurityEvent('LOGIN_FAILED_2FA', {
          userId: user._id,
          ip: clientIp
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
=======
        logSecurityEvent('LOGIN_FAILED_2FA', { 
          userId: user._id, 
          ip: clientIp 
        });
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid 2FA code' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }
    }

    // 9. SUCCESS - RESET ATTEMPTS & CREATE SESSION IN MONGODB
    await user.resetLoginAttempts();
<<<<<<< HEAD

=======
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    // ✅ Generate tokens and session ID
    const jti = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const token = generateToken(user._id, jti, TOKEN_EXPIRES);
<<<<<<< HEAD

    const expiresAt = new Date(Date.now() + COOKIE_EXPIRES);

=======
    
    const expiresAt = new Date(Date.now() + COOKIE_EXPIRES);
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD

      // ✅ Enforce max sessions per user
      const sessions = await Session.find({ userId: user._id })
        .sort({ lastActivity: -1 });

      if (sessions.length > (user.maxSessions || 3)) {
        // Delete oldest sessions
        const toDelete = sessions.slice(user.maxSessions || 3);
        await Session.deleteMany({
          _id: { $in: toDelete.map(s => s._id) }
        });

=======
      
      // ✅ Enforce max sessions per user
      const sessions = await Session.find({ userId: user._id })
        .sort({ lastActivity: -1 });
      
      if (sessions.length > (user.maxSessions || 3)) {
        // Delete oldest sessions
        const toDelete = sessions.slice(user.maxSessions || 3);
        await Session.deleteMany({ 
          _id: { $in: toDelete.map(s => s._id) } 
        });
        
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        logSecurityEvent('MAX_SESSIONS_EXCEEDED', {
          userId: user._id,
          deletedCount: toDelete.length
        });
      }
<<<<<<< HEAD

=======
      
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      // Continue with login even if session creation fails (fallback)
    }
<<<<<<< HEAD

=======
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    // ✅ Update user login info
    await User.findByIdAndUpdate(user._id, {
      $set: {
        lastLogin: new Date(),
        lastLoginIP: clientIp
      }
    });

<<<<<<< HEAD
    logSecurityEvent('LOGIN_SUCCESS', {
      userId: user._id,
=======
    logSecurityEvent('LOGIN_SUCCESS', { 
      userId: user._id, 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
=======
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    });
  }
};


exports.logout = async (req, res) => {
  try {
    if (req.user && req.jti) {
      // ✅ 1. Add JWT to blacklist (in-memory + MongoDB)
      await JWTBlacklist.add(req.jti, COOKIE_EXPIRES / 1000);
<<<<<<< HEAD

      // ✅ 2. Remove session from MongoDB
      const deletedSession = await Session.findOneAndDelete({ token: req.jti });

=======
 
      // ✅ 2. Remove session from MongoDB
      const deletedSession = await Session.findOneAndDelete({ token: req.jti });
 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      if (deletedSession) {
        logSecurityEvent('SESSION_DELETED', {
          userId: req.user._id,
          sessionId: deletedSession.sessionId,
          ip: req.ip
        });
      }
    }
<<<<<<< HEAD

=======
 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    // ✅ 3. Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
<<<<<<< HEAD
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

=======
      secure: process.env.NODE_ENV === 'development',
      sameSite: 'strict'
    });
 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    logSecurityEvent('USER_LOGOUT', {
      userId: req.user?._id,
      ip: req.ip
    });
<<<<<<< HEAD

=======
 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
<<<<<<< HEAD

=======
 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    const result = await Session.deleteMany({ userId: req.user._id });

=======
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }
    const result = await Session.deleteMany({ userId: req.user._id });
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    logSecurityEvent('LOGOUT_ALL_SESSIONS', {
      userId: req.user._id,
      deletedCount: result.deletedCount,
      ip: req.ip
    });
<<<<<<< HEAD
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
=======
    res.cookie('token', 'none', { 
      expires: new Date(Date.now() + 10 * 1000), 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
<<<<<<< HEAD
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
=======
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
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    });
  }
};

// ==========================================
// GET ACTIVE SESSIONS (Security Feature)
// ==========================================
exports.getActiveSessions = async (req, res) => {
  try {
    if (!req.user) {
<<<<<<< HEAD
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

=======
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    const sessions = await Session.find({ userId: req.user._id })
      .select('sessionId deviceInfo ipAddress lastActivity createdAt expiresAt')
      .sort({ lastActivity: -1 })
      .lean();
<<<<<<< HEAD

=======
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    // ✅ Mark current session
    const currentSessions = sessions.map(session => ({
      ...session,
      isCurrent: session.token === req.jti
    }));
<<<<<<< HEAD

    res.status(200).json({
      success: true,
=======
    
    res.status(200).json({ 
      success: true, 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      data: {
        sessions: currentSessions,
        count: sessions.length,
        maxAllowed: req.user.maxSessions || 3
      }
    });
<<<<<<< HEAD

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
=======
    
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch sessions' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD

      if (attempts > 3) {
        logSecurityEvent('PASSWORD_RESET_RATE_LIMIT', { email, ip: clientIp });
        return res.status(429).json({
          success: false,
          message: 'Too many password reset attempts. Try again in 1 hour.'
=======
      
      if (attempts > 3) {
        logSecurityEvent('PASSWORD_RESET_RATE_LIMIT', { email, ip: clientIp });
        return res.status(429).json({ 
          success: false, 
          message: 'Too many password reset attempts. Try again in 1 hour.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }
    } catch (redisError) {
      // Fallback to existing in-memory rate limiting
      if (!checkRateLimit(`forgot_${clientIp}`, 3, 60 * 60 * 1000)) {
<<<<<<< HEAD
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Try again later.'
=======
        return res.status(429).json({ 
          success: false, 
          message: 'Too many requests. Try again later.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
        });
      }
    }



    // Rate limiting
    if (!checkRateLimit(`forgot_${clientIp}`, 3, 60 * 60 * 1000)) {
<<<<<<< HEAD
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Try again later.'
=======
      return res.status(429).json({ 
        success: false, 
        message: 'Too many requests. Try again later.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Valid email required'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Valid email required' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    // Always return success (prevent user enumeration)
<<<<<<< HEAD
    const genericResponse = {
      success: true,
      message: 'If an account exists, a reset code has been sent.'
=======
    const genericResponse = { 
      success: true, 
      message: 'If an account exists, a reset code has been sent.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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

<<<<<<< HEAD
    logSecurityEvent('PASSWORD_RESET_REQUESTED', {
      userId: user._id,
      ip: clientIp
=======
    logSecurityEvent('PASSWORD_RESET_REQUESTED', { 
      userId: user._id, 
      ip: clientIp 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    });

    res.status(200).json(genericResponse);
  } catch (error) {
<<<<<<< HEAD
    res.status(500).json({
      success: false,
      message: 'Request failed. Try again.'
=======
    res.status(500).json({ 
      success: false, 
      message: 'Request failed. Try again.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Email and OTP required'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP required' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // Rate limiting
    if (!checkRateLimit(`otp_${cleanEmail}`, 5, 15 * 60 * 1000)) {
<<<<<<< HEAD
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Try again later.'
=======
      return res.status(429).json({ 
        success: false, 
        message: 'Too many attempts. Try again later.' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    const otpResult = verifyOTPUtils(cleanEmail, otp);
    if (!otpResult.valid) {
<<<<<<< HEAD
      logSecurityEvent('OTP_VERIFICATION_FAILED', {
        email: cleanEmail,
        ip: clientIp
      });
      return res.status(400).json({
        success: false,
        message: otpResult.message
=======
      logSecurityEvent('OTP_VERIFICATION_FAILED', { 
        email: cleanEmail, 
        ip: clientIp 
      });
      return res.status(400).json({ 
        success: false, 
        message: otpResult.message 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
<<<<<<< HEAD
      return res.status(404).json({
        success: false,
        message: 'User not found'
=======
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    logSecurityEvent('OTP_VERIFIED', { userId: user._id, ip: clientIp });

<<<<<<< HEAD
    res.status(200).json({
      success: true,
      data: { resetToken }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed'
=======
    res.status(200).json({ 
      success: true, 
      data: { resetToken } 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Token and password required'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Token and password required' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+passwordHistory');

    if (!user) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: pwdCheck.errors
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Password does not meet security requirements',
        errors: pwdCheck.errors 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    if (isCommonPassword(password)) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Password is too common'
      });
    }
    if (user.isPasswordInHistory && await user.isPasswordInHistory(password)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reuse recent passwords'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Password is too common' 
      });
    }
    if (user.isPasswordInHistory && await user.isPasswordInHistory(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot reuse recent passwords' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.activeSessions = [];
    await user.save();
<<<<<<< HEAD
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
=======
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
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Verification token required'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Verification token required' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
=======
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification token' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

<<<<<<< HEAD
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
=======
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
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    });
  }
};

// ==========================================
// GET ME - SECURE WITH DECRYPTED PHONE
// ==========================================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -passwordHistory');
<<<<<<< HEAD

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
=======
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      });
    }

    // 🔧 FIX: Properly decrypt phone before sending
    const userData = user.toObject();
<<<<<<< HEAD

=======
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
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

<<<<<<< HEAD
    res.status(200).json({
      success: true,
=======
    res.status(200).json({ 
      success: true, 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
<<<<<<< HEAD
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
=======
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user data' 
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    });
  }
};

exports.validatePassword = async (req, res) => {
  try {
    const { password } = req.body;
<<<<<<< HEAD

    const validation = validatePassword(password);
    const isCommon = isCommonPassword(password);

=======
    
    const validation = validatePassword(password);
    const isCommon = isCommonPassword(password);
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    if (isCommon) {
      validation.isValid = false;
      validation.errors.push('Password is too common');
    }
<<<<<<< HEAD

=======
    
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    res.json({ success: true, data: validation });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation failed' });
  }
};