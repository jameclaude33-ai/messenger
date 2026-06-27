const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SALT = 'messenger-salt-v2';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const masterSecret = process.env.ENCRYPTION_KEY || 'default-messenger-key-change-me';

function deriveKey(salt) {
  return crypto.pbkdf2Sync(masterSecret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

const masterKey = deriveKey(SALT);

const sessionKeys = new Map();

function createSessionKey(sessionId) {
  const sessionSalt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(masterKey, sessionSalt, ITERATIONS, KEY_LENGTH, 'sha512');
  sessionKeys.set(sessionId, { key, salt: sessionSalt });
  return { sessionId, salt: sessionSalt.toString('hex') };
}

function getSessionKey(sessionId) {
  const session = sessionKeys.get(sessionId);
  if (!session) return masterKey;
  return session.key;
}

function encrypt(text, sessionId) {
  const key = sessionId ? getSessionKey(sessionId) : masterKey;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText, sessionId) {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return legacyDecrypt(encryptedText);
    }
    const key = sessionId ? getSessionKey(sessionId) : masterKey;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return legacyDecrypt(encryptedText);
  }
}

function legacyDecrypt(encryptedText) {
  try {
    const legacyKey = crypto.scryptSync(masterSecret, 'salt', 32);
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText;
  }
}

function signMessage(text, sessionId) {
  const key = sessionId ? getSessionKey(sessionId) : masterKey;
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(text);
  return hmac.digest('hex');
}

function verifySignature(text, signature, sessionId) {
  const expected = signMessage(text, sessionId);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

function removeSessionKey(sessionId) {
  sessionKeys.delete(sessionId);
}

module.exports = {
  encrypt,
  decrypt,
  signMessage,
  verifySignature,
  createSessionKey,
  removeSessionKey,
};
