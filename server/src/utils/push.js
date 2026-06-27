const webpush = require('web-push');

const VAPID_PUBLIC_KEY = 'BCikmr-XWYhJ2pZ3iRjJIhp62RDHmccRKP8VPhPS-MbAC51pwNGB4ZNUdMJSHuHw4qGFCG_B4HSV7lAFaNr1BNM';
const VAPID_PRIVATE_KEY = 't3RNOnMg3ysUpTQyYDw-e98LSQRswOwVzGO6bkM0WFU';

webpush.setVapidDetails('mailto:messenger@flavty.onrender.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const subscriptions = new Map();

function addSubscription(username, subscription) {
  if (!subscriptions.has(username)) {
    subscriptions.set(username, []);
  }
  const subs = subscriptions.get(username);
  const exists = subs.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
  }
}

function removeSubscription(username, endpoint) {
  if (!subscriptions.has(username)) return;
  const subs = subscriptions.get(username).filter(s => s.endpoint !== endpoint);
  subscriptions.set(username, subs);
}

function removeUserSubscriptions(username) {
  subscriptions.delete(username);
}

async function sendPushNotification(username, payload) {
  const subs = subscriptions.get(username);
  if (!subs || subs.length === 0) return;

  const promises = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        removeSubscription(username, sub.endpoint);
      }
    }
  });

  await Promise.allSettled(promises);
}

function getPublicKey() {
  return VAPID_PUBLIC_KEY;
}

function getAllSubscribedUsernames() {
  return Array.from(subscriptions.keys());
}

function hasSubscription(username) {
  const subs = subscriptions.get(username);
  return subs && subs.length > 0;
}

module.exports = { addSubscription, removeSubscription, removeUserSubscriptions, sendPushNotification, getPublicKey, getAllSubscribedUsernames, hasSubscription };
