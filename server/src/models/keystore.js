const userPublicKeys = new Map();

function storePublicKey(userId, username, publicKey) {
  userPublicKeys.set(userId, { userId, username, publicKey, storedAt: new Date() });
}

function getPublicKey(userId) {
  return userPublicKeys.get(userId) || null;
}

function getPublicKeyByUsername(username) {
  for (const entry of userPublicKeys.values()) {
    if (entry.username === username) return entry;
  }
  return null;
}

function removePublicKey(userId) {
  userPublicKeys.delete(userId);
}

module.exports = { storePublicKey, getPublicKey, getPublicKeyByUsername, removePublicKey };
