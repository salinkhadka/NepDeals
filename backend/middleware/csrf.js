// const crypto = require('crypto');

// // Store CSRF tokens in memory (in production, use Redis)
// const tokens = new Map();

// /**
//  * Generate CSRF token
//  */
// exports.generateToken = (req, res, next) => {
//   const token = crypto.randomBytes(32).toString('hex');
//   const expiresAt = Date.now() + 15 * 60 * 1000;
<<<<<<< HEAD

=======
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
//   tokens.set(token, { expiresAt, createdAt: Date.now() });

//   cleanExpiredTokens();

//   // 🎯 CHANGE: httpOnly must be FALSE so frontend can read it
//   res.cookie('csrf-token', token, {
//     httpOnly: false, 
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'lax', // Use 'lax' for easier local development
//     maxAge: 15 * 60 * 1000
//   });

//   req.csrfToken = token;
//   next();
// };


// /**
//  * Verify CSRF token
//  */
// exports.verifyToken = (req, res, next) => {
//   // Skip GET, HEAD, OPTIONS requests
//   if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
//     return next();
//   }

//   const token = req.body._csrf || req.headers['x-csrf-token'] || req.cookies['csrf-token'];
<<<<<<< HEAD

=======
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
//   if (!token) {
//     return res.status(403).json({
//       success: false,
//       message: 'CSRF token missing'
//     });
//   }

//   const tokenData = tokens.get(token);
<<<<<<< HEAD

=======
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
//   if (!tokenData) {
//     return res.status(403).json({
//       success: false,
//       message: 'Invalid CSRF token'
//     });
//   }

//   if (tokenData.expiresAt < Date.now()) {
//     tokens.delete(token);
//     return res.status(403).json({
//       success: false,
//       message: 'CSRF token expired'
//     });
//   }
//   next();
// };

// /**
//  * Clean expired tokens
//  */
// function cleanExpiredTokens() {
//   const now = Date.now();
//   for (const [token, data] of tokens.entries()) {
//     if (data.expiresAt < now) {
//       tokens.delete(token);
//     }
//   }
// }

// // Clean expired tokens every 5 minutes
// setInterval(cleanExpiredTokens, 5 * 60 * 1000);






























const crypto = require('crypto');

// Store CSRF tokens in memory (in production, use Redis)
const tokens = new Map();

/**
 * Generate CSRF token
 */
// middleware/csrf.js
exports.generateToken = (req, res, next) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 15 * 60 * 1000;
<<<<<<< HEAD

=======
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
  tokens.set(token, { expiresAt, createdAt: Date.now() });
  cleanExpiredTokens();

  // ✅ FIX: Add Secure flag in production
  res.cookie('csrf-token', token, {
<<<<<<< HEAD
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production', // ✅ HTTPS only in prod
=======
    httpOnly: false, 
    secure: process.env.NODE_ENV === 'development', // ✅ HTTPS only in prod
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
  });

  req.csrfToken = token;
  next();
};

/**
 * Verify CSRF token
 */
exports.verifyToken = (req, res, next) => {
  // Skip GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.body._csrf || req.headers['x-csrf-token'] || req.cookies['csrf-token'];
<<<<<<< HEAD

=======
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
  }

  const tokenData = tokens.get(token);
<<<<<<< HEAD

=======
  
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
  if (!tokenData) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  if (tokenData.expiresAt < Date.now()) {
    tokens.delete(token);
    return res.status(403).json({
      success: false,
      message: 'CSRF token expired'
    });
  }
  next();
};

/**
 * Clean expired tokens
 */
function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokens.entries()) {
    if (data.expiresAt < now) {
      tokens.delete(token);
    }
  }
}

// Clean expired tokens every 5 minutes
setInterval(cleanExpiredTokens, 5 * 60 * 1000);

