const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const VAPID_PUBLIC_KEY = 'BCikmr-XWYhJ2pZ3iRjJIhp62RDHmccRKP8VPhPS-MbAC51pwNGB4ZNUdMJSHuHw4qGFCG_B4HSV7lAFaNr1BNM';
const VAPID_PRIVATE_KEY = 't3RNOnMg3ysUpTQyYDw-e98LSQRswOwVzGO6bkM0WFU';

webpush.setVapidDetails('mailto:messenger@flavty.onrender.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const SUBS_FILE = path.join(__dirname, '../../data/subscriptions.json');

let subscriptions = new Map();

function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
      subscriptions = new Map(Object.entries(data));
      console.log(`Loaded ${subscriptions.size} push subscription entries`);
    }
  } catch (err) {
    console.error('Failed to load subscriptions:', err.message);
  }
}

function saveSubscriptions() {
  try {
    const dir = path.dirname(SUBS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SUBS_FILE, JSON.stringify(Object.fromEntries(subscriptions)));
  } catch (err) {
    console.error('Failed to save subscriptions:', err.message);
  }
}

loadSubscriptions();

function addSubscription(username, subscription) {
  if (!subscriptions.has(username)) {
    subscriptions.set(username, []);
  }
  const subs = subscriptions.get(username);
  const exists = subs.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    saveSubscriptions();
    console.log(`Push subscription added for ${username} (total: ${subs.length})`);
  }
}

function removeSubscription(username, endpoint) {
  if (!subscriptions.has(username)) return;
  const subs = subscriptions.get(username).filter(s => s.endpoint !== endpoint);
  subscriptions.set(username, subs);
  saveSubscriptions();
}

function removeUserSubscriptions(username) {
  subscriptions.delete(username);
  saveSubscriptions();
}

async function sendPushNotification(username, payload) {
  const subs = subscriptions.get(username);
  if (!subs || subs.length === 0) {
    console.log(`No push subscriptions for ${username}`);
    return;
  }

  console.log(`Sending push to ${username} (${subs.length} subscriptions)`);
  const promises = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      console.log(`Push sent to ${username} successfully`);
    } catch (err) {
      console.error(`Push failed for ${username}:`, err.statusCode, err.message);
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
