const express = require('express');
const { storePublicKey, getPublicKey, getPublicKeyByUsername } = require('../models/keystore');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/publish', authMiddleware, (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) {
    return res.status(400).json({ error: 'Public key required' });
  }
  storePublicKey(req.user.id, req.user.username, publicKey);
  res.json({ ok: true });
});

router.get('/user/:userId', authMiddleware, (req, res) => {
  const key = getPublicKey(req.params.userId);
  if (!key) {
    return res.status(404).json({ error: 'Public key not found' });
  }
  res.json(key);
});

router.get('/username/:username', authMiddleware, (req, res) => {
  const key = getPublicKeyByUsername(req.params.username);
  if (!key) {
    return res.status(404).json({ error: 'Public key not found' });
  }
  res.json(key);
});

module.exports = router;
