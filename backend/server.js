const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const path = require('path');
const compression = require('compression');

const {
  dynamicRateLimiter,
  advancedInputSanitization,
  strictTypeValidation,
  validateHostHeader,
  enhancedCSP,
  cacheControl,
  requestId,
  validateInputSizes
} = require('./middleware/advancedSecurity');

const { generateToken: generateCSRFToken } = require('./middleware/csrf');
const { preventHPP } = require('./middleware/hpp');
const logger = require('./utils/logger');

require('dotenv').config();

const app = express();

// ==========================================
// STARTUP SECURITY CHECK
// ==========================================
const checkSecurityDependencies = async () => {
  const checks = {
    mongodb: false,
    encryption: false,
    jwt: false,
    email: false
  };

  // 1. MongoDB Check
  try {
    if (mongoose.connection.readyState === 1) {
      checks.mongodb = true;
      console.log('✅ MongoDB: Connected');
    } else {
      console.log('⏳ MongoDB: Connecting...');
    }
  } catch (e) {
    console.error('❌ MongoDB unavailable:', e.message);
  }

  // 2. Encryption Check
  try {
    const { encrypt, decrypt } = require('./utils/encryption');
    const test = encrypt('security-test');
    if (decrypt(test) === 'security-test') {
      checks.encryption = true;
      console.log('✅ Encryption: Working');
    }
  } catch (e) {
    console.error('❌ Encryption unavailable:', e.message);
  }

  // 3. JWT Check
  try {
    const generateToken = require('./utils/generateToken');
    const jwt = require('jsonwebtoken');
    const testToken = generateToken('test-user-id', 'test-jti', '1h');
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'fallback-secret');
    if (decoded) {
      checks.jwt = true;
      console.log('✅ JWT: Working');
    }
  } catch (e) {
    console.error('❌ JWT unavailable:', e.message);
  }

  // 4. Email Configuration Check
  try {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      checks.email = true;
      console.log('✅ Email: Configured');
    } else {
      console.warn('⚠️  Email: Not fully configured (optional)');
    }
  } catch (e) {
    console.warn('⚠️  Email check failed (optional)');
  }

  // Critical checks
  const criticalChecks = [checks.mongodb, checks.encryption, checks.jwt];
  const allCriticalPassed = criticalChecks.every(check => check === true);

  if (!allCriticalPassed) {
    console.error('❌ CRITICAL: Not all security dependencies available');
    if (process.env.NODE_ENV === 'production') {
      console.error('💀 Shutting down due to missing critical dependencies');
      process.exit(1);
    } else {
      console.warn('⚠️  Development mode: Continuing despite missing dependencies');
    }
  } else {
    console.log('✅ All critical security dependencies operational');
  }

  return checks;
};

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

// 1. Trust proxy (for correct IP detection behind load balancers)
app.set('trust proxy', 1);

// 2. Disable X-Powered-By header (information disclosure prevention)
app.disable('x-powered-by');

// 3. Static files (with security)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: false,
  setHeaders: (res, path) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// 4. Security Headers
app.use(helmet({
  contentSecurityPolicy: false, //we use custom csp
  hsts: {
    maxAge: 63072000, //maximum age of 2 years
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));

// 5. Custom Security Headers
app.use(enhancedCSP);
app.use(cacheControl);
app.use(requestId);
app.use(validateHostHeader);

// 6. Additional Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Remove sensitive headers in responses
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
});

// // 7. CORS Configuration
// const allowedOrigins = [process.env.FRONTEND_URL];
// if (process.env.NODE_ENV !== 'production') {
//   allowedOrigins.push('http://localhost:5173');
//   allowedOrigins.push('http://localhost:3000');
// }

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://localhost:5173', // ✅ ADD THIS - Your frontend is now HTTPS!
  'http://localhost:3000'
];


app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.logSecurityEvent('CORS_BLOCK', {
        origin,
        timestamp: new Date().toISOString()
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-Timestamp'
  ],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400
}));

// 8. Body Parsing (with size limits for DoS protection)
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf, encoding) => {
    // Store raw body for webhook signature verification if needed
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10kb',
  parameterLimit: 50 // Limit number of parameters
}));
app.use(cookieParser());


app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.logSecurityEvent('NOSQL_INJECTION_DETECTED', {
      path: req.path,
      key,
      ip: req.ip
    });
  }
}));
app.use(xss());
app.use(preventHPP);
app.use(advancedInputSanitization);
app.use(strictTypeValidation);

// 10. Compression (with BREACH attack mitigation)
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses with sensitive data
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

// 11. Rate Limiting (Global)
app.use('/api/', dynamicRateLimiter);

// 12. Input Size Validation
app.use('/api/', validateInputSizes);

// 13. CSRF Protection
app.use('/api/', generateCSRFToken);

// 14. Access Logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logAccess(req, res, duration);

    // Log slow requests
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });

  next();
});

// ==========================================
// DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  retryWrites: true,
  w: 'majority'
})
  .then(async () => {
    console.log('✅ MongoDB Connected: ' + mongoose.connection.host);

    // Run security checks after DB connection
    await checkSecurityDependencies();

    // Log security event
    logger.logSecurityEvent('SERVER_STARTED', {
      mode: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Failed:', err.message);
    logger.logSecurityEvent('DATABASE_CONNECTION_FAILED', {
      error: err.message,
      severity: 'CRITICAL'
    });
    process.exit(1);
  });

// Monitor database connection
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Error:', err.message);
  logger.logSecurityEvent('DATABASE_ERROR', {
    error: err.message
  });
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB Disconnected');
  logger.logSecurityEvent('DATABASE_DISCONNECTED', {});
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Reconnected');
  logger.logSecurityEvent('DATABASE_RECONNECTED', {});
});

// ==========================================
// ROUTES
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==========================================
// ERROR HANDLERS
// ==========================================

// 404 Handler
app.use((req, res) => {
  logger.logSecurityEvent('404_NOT_FOUND', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Log error
  logger.logError(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id
  });

  // Handle specific error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload too large'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // Default error response
  const message = process.env.NODE_ENV === 'production'
    ? 'Server Error'
    : err.message;

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');

    // Close database connection
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💀 Uncaught Exception:', err);
  logger.logError(err, { type: 'uncaughtException' });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💀 Unhandled Rejection at:', promise, 'reason:', reason);
  logger.logError(new Error(reason), { type: 'unhandledRejection' });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🛡️  NepDeals SECURE E-COMMERCE SERVER');
  console.log('='.repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔒 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Session Storage: MongoDB`);
  console.log(`🚫 Redis: Disabled (Using in-memory + MongoDB)`);
  console.log(`🔐 CSRF Protection: Enabled`);
  console.log(`🛡️  Rate Limiting: Enabled`);
  console.log(`🔒 Encryption: AES-256-GCM`);
  console.log(`📝 Logging: Winston`);
  console.log('='.repeat(60) + '\n');
});

module.exports = app;