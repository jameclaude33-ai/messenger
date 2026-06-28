const API_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push not supported');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
}

async function subscribeToPush(token, retries = 3) {
  console.log('[PUSH] Starting subscription...');
  for (let i = 0; i < retries; i++) {
    try {
      const registration = await registerServiceWorker();
      if (!registration) {
        console.log('[PUSH] No service worker registration');
        return false;
      }

      const res = await fetch(`${API_URL}/api/push/vapid-key`);
      if (!res.ok) {
        console.error('[PUSH] Failed to fetch VAPID key:', res.status);
        continue;
      }
      const { publicKey } = await res.json();
      console.log('[PUSH] VAPID key received');

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log('[PUSH] Creating new subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        console.log('[PUSH] Subscription created:', subscription.endpoint.substring(0, 50));
      } else {
        console.log('[PUSH] Using existing subscription');
      }

      const subRes = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (subRes.ok) {
        console.log('[PUSH] Subscribed successfully');
        return true;
      } else {
        console.error('[PUSH] Server rejected subscription:', subRes.status);
      }
    } catch (err) {
      console.error(`[PUSH] Attempt ${i + 1} failed:`, err.message);
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function unsubscribeFromPush(token) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    }
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[PUSH] Notifications not supported');
    return false;
  }
  console.log('[PUSH] Current permission:', Notification.permission);
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  console.log('[PUSH] Permission result:', result);
  return result === 'granted';
}

export { subscribeToPush, unsubscribeFromPush, requestNotificationPermission };
