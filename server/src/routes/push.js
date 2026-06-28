const express = require('express');
const { addSubscription, removeSubscription, getPublicKey, hasSubscription, getAllSubscribedUsernames, sendPushNotification } = require('../utils/push');
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

router.post('/test', authMiddleware, async (req, res) => {
  const { sendPushNotification: sendPush, getAllSubscribedUsernames, hasSubscription } = require('../utils/push');
  const username = req.user.username;
  const allSubs = getAllSubscribedUsernames();
  const hasSub = hasSubscription(username);
  console.log(`[PUSH-TEST] User: ${username}, hasSubscription: ${hasSub}, allSubscribed: [${allSubs.join(', ')}]`);
  try {
    await sendPush(username, {
      title: 'Test Push',
      body: 'Push уведомления работают!',
      url: '/',
    });
    res.json({ ok: true, message: 'Push sent', username, hasSub, allSubs });
  } catch (err) {
    console.error('[PUSH-TEST] Error:', err);
    res.status(500).json({ error: err.message, username, hasSub, allSubs });
  }
});

module.exports = router;
