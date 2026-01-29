const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Generate TOTP secret for 2FA
 * @param {String} email - User email
 * @returns {Object} - Secret and QR code data
 */
exports.generateSecret = (email) => {
  const secret = speakeasy.generateSecret({
    name: `NepDeals (${email})`,
    issuer: 'NepDeals',
    length: 32
  });

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url
  };
};


exports.verifyToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};

exports.generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
};

exports.verifyBackupCode = (code, backupCodes) => {
  const index = backupCodes.indexOf(code.toUpperCase());
  if (index > -1) {
    backupCodes.splice(index, 1); // Remove used code
    return true;
  }
  return false;
};



