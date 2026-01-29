const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { JWTBlacklist } = require('./advancedSecurity');
const { logSecurityEvent } = require('../utils/logger');

let jwtSecret;
const publicKeyPath = path.join(__dirname, '../keys/public.pem');

if (fs.existsSync(publicKeyPath)) {
  jwtSecret = fs.readFileSync(publicKeyPath, 'utf8');
} else {
  jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
}

/**
 * Protect routes (ENHANCED) - Fixed to read from cookies properly
 */
exports.protect = async (req, res, next) => {
  let token;

  // 1. Check cookie first (primary method)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization header (fallback)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

<<<<<<< HEAD
  // No token found - this is normal when not logged in
=======
  // Debug log (remove in production)
  if (!token) {
    console.log('❌ No token found in cookies or headers');
    console.log('Cookies:', req.cookies);
    console.log('Headers:', req.headers.authorization);
  }

>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token
    const algorithm = fs.existsSync(publicKeyPath) ? 'RS256' : 'HS256';
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: [algorithm]
    });

    // Check if JWT is blacklisted (optional - skip if Redis is down)
    try {
      const isBlacklisted = await JWTBlacklist.isBlacklisted(decoded.jti);
      if (isBlacklisted) {
        logSecurityEvent('BLACKLISTED_JWT_USED', {
          jti: decoded.jti,
          ip: req.ip
        });

        return res.status(401).json({
          success: false,
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      }
    } catch (redisError) {
      // Skip blacklist check if Redis is down
      console.warn('Redis unavailable, skipping blacklist check');
    }

    // Get user
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Store jti for logout
    req.jti = decoded.jti;

    next();
  } catch (error) {
    console.error('Token verification error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      logSecurityEvent('INVALID_JWT', {
        error: error.message,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized',
      code: 'AUTH_FAILED'
    });
  }
};


exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user._id,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        message: 'Forbidden - Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  };
};

/**
 * Verify email before accessing protected routes
 */
exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email first',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }
  next();
};