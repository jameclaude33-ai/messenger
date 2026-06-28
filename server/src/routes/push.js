const express = require('express');
const { addSubscription, removeSubscription, getPublicKey, hasSubscription, getAllSubscribedUsernames } = require('../utils/push');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

router.get('/status', authMiddleware, (req, res) => {
  res.json({
    subscribed: hasSubscription(req.user.username),
    allSubscribed: getAllSubscribedUsernames(),
  });
});

router.post('/subscribe', authMiddleware, (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  addSubscription(req.user.username, subscription);
  res.json({ ok: true });
});

router.post('/unsubscribe', authMiddleware, (req, res) => {
  const { subscription } = req.body;
  if (subscription && subscription.endpoint) {
    removeSubscription(req.user.username, subscription.endpoint);
  }
  res.json({ ok: true });
});

module.exports = router;
