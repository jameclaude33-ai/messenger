import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const API_URL = 'https://flavty.onrender.com';

function getRandomBytes(length) {
  return Crypto.getRandomValues(new Uint8Array(length));
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

function generateSimpleKeyPair() {
  const privateKey = getRandomBytes(32);
  const publicKey = getRandomBytes(32);
  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: arrayBufferToBase64(privateKey),
    type: 'simple',
  };
}

function deriveSharedKeySimple(privateKeyB64, publicKeyB64) {
  const priv = new Uint8Array(base64ToArrayBuffer(privateKeyB64));
  const pub = new Uint8Array(base64ToArrayBuffer(publicKeyB64));
  const shared = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    shared[i] = priv[i] ^ pub[i];
  }
  return arrayBufferToBase64(shared);
}

function encryptMessageSimple(sharedKeyB64, plaintext) {
  const keyBytes = new Uint8Array(base64ToArrayBuffer(sharedKeyB64));
  const iv = getRandomBytes(12);
  const textBytes = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % 32] ^ iv[i % 12];
  }
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

function decryptMessageSimple(sharedKeyB64, ciphertextB64, ivB64) {
  const keyBytes = new Uint8Array(base64ToArrayBuffer(sharedKeyB64));
  const encrypted = new Uint8Array(base64ToArrayBuffer(ciphertextB64));
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % 32] ^ iv[i % 12];
  }
  return new TextDecoder().decode(decrypted);
}

async function getOrCreateKeyPair() {
  try {
    const stored = await AsyncStorage.getItem('messenger_e2e_keys');
    if (stored) return JSON.parse(stored);
  } catch (err) {}
  const keyPair = generateSimpleKeyPair();
  await AsyncStorage.setItem('messenger_e2e_keys', JSON.stringify(keyPair));
  return keyPair;
}

async function publishPublicKey(publicKey, token) {
  await fetch(`${API_URL}/api/keys/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publicKey }),
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

const keyCache = new Map();

async function getSharedKey(myKeyPair, otherUsername, token) {
  const cached = keyCache.get(otherUsername);
  if (cached) return cached;
  const otherPublicKey = await fetchPublicKey(otherUsername, token);
  if (!otherPublicKey) return null;
  const sharedKey = deriveSharedKeySimple(myKeyPair.privateKey, otherPublicKey);
  keyCache.set(otherUsername, sharedKey);
  return sharedKey;
}

function clearKeyCache() {
  keyCache.clear();
}

async function encryptMsg(sharedKey, text) {
  return encryptMessageSimple(sharedKey, text);
}

async function decryptMsg(sharedKey, ciphertext, iv) {
  return decryptMessageSimple(sharedKey, ciphertext, iv);
}

export {
  getOrCreateKeyPair,
  publishPublicKey,
  fetchPublicKey,
  getSharedKey,
  clearKeyCache,
  encryptMsg,
  decryptMsg,
};
