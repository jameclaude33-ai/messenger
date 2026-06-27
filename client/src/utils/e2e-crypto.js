const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const EC_PARAMS = { name: 'ECDH', namedCurve: 'P-256' };
const AES_PARAMS = { name: 'AES-GCM', length: 256 };
const HKDF_INFO = new TextEncoder().encode('messenger-e2e-v1');

async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(EC_PARAMS, true, ['deriveKey', 'deriveBits']);
  const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKey, privateKey };
}

async function importPublicKey(jwk) {
  return crypto.subtle.importKey('jwk', jwk, EC_PARAMS, true, []);
}

async function importPrivateKey(jwk) {
  return crypto.subtle.importKey('jwk', jwk, EC_PARAMS, false, ['deriveKey', 'deriveBits']);
}

async function deriveSharedKey(privateKeyJwk, publicKeyJwk) {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const publicKey = await importPublicKey(publicKeyJwk);

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );

  const sharedBuffer = new Uint8Array(sharedBits);
  const salt = new Uint8Array(32);
  for (let i = 0; i < sharedBuffer.length && i < 32; i++) {
    salt[i] = sharedBuffer[i];
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw', sharedBits, 'HKDF', false, ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: HKDF_INFO },
    keyMaterial,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptMessage(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
  };
}

async function decryptMessage(sharedKey, ciphertextB64, ivB64) {
  const ciphertext = base64ToArrayBuffer(ciphertextB64);
  const iv = base64ToArrayBuffer(ivB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    sharedKey,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function publishPublicKey(publicKeyJwk, token) {
  await fetch(`${API_URL}/api/keys/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publicKey: publicKeyJwk }),
  });
}

async function fetchPublicKey(username, token) {
  const res = await fetch(`${API_URL}/api/keys/username/${username}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.publicKey;
}

function getStoredKeyPair() {
  const stored = localStorage.getItem('messenger_e2e_keys');
  if (!stored) return null;
  return JSON.parse(stored);
}

function storeKeyPair(keyPair) {
  localStorage.setItem('messenger_e2e_keys', JSON.stringify(keyPair));
}

async function getOrCreateKeyPair() {
  let keyPair = getStoredKeyPair();
  if (!keyPair) {
    keyPair = await generateKeyPair();
    storeKeyPair(keyPair);
  }
  return keyPair;
}

const keyCache = new Map();

async function getSharedKey(myKeyPair, otherUsername, token) {
  const cached = keyCache.get(otherUsername);
  if (cached) return cached;

  const otherPublicKey = await fetchPublicKey(otherUsername, token);
  if (!otherPublicKey) return null;

  const sharedKey = await deriveSharedKey(myKeyPair.privateKey, otherPublicKey);
  keyCache.set(otherUsername, sharedKey);
  return sharedKey;
}

function clearKeyCache() {
  keyCache.clear();
}

module.exports = {
  generateKeyPair,
  publishPublicKey,
  fetchPublicKey,
  getOrCreateKeyPair,
  getStoredKeyPair,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  getSharedKey,
  clearKeyCache,
  arrayBufferToBase64,
  base64ToArrayBuffer,
};
