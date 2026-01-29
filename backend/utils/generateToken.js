const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let jwtSecret;
let useRSA = false;

const privateKeyPath = path.join(__dirname, '../keys/private.pem');
const publicKeyPath = path.join(__dirname, '../keys/public.pem');

if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
  useRSA = true;
  jwtSecret = fs.readFileSync(privateKeyPath, 'utf8');
} else {
  jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
  console.warn('⚠️  Using HS256. Generate RSA keys for production!');
}

const generateToken = (id, jti = null, expiresIn = '7d') => {
  const tokenId = jti || crypto.randomUUID();

  const payload = {
    id,
    jti: tokenId,
    type: 'access'
  };

  const options = {
    expiresIn: expiresIn,
    algorithm: useRSA ? 'RS256' : 'HS256',
    issuer: 'NepDeals-api',
    audience: 'NepDeals-client'
  };

  return jwt.sign(payload, jwtSecret, options);
};

const generateRSAKeys = () => {
  const keyDir = path.join(__dirname, '../keys');
  if (!fs.existsSync(keyDir)) {
    fs.mkdirSync(keyDir, { recursive: true });
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);

  console.log('✅ RSA key pair generated (4096 bit)');
};


module.exports = generateToken;