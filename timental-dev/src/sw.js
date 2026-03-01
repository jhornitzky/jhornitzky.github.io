import { precacheAndRoute } from 'workbox-precaching';

// Precache and route all assets (manifest is injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);

// ─── Notification click: focus existing window or open a new one ─────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/timental/') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/timental/');
        }
      })
  );
});

// ─── Periodic Background Sync: check reminder in background ──────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(checkAndShowReminder());
  }
});

// ─── Helpers: raw IndexedDB access (Dexie can't be used in SW context) ───────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TimentalDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    // If the database doesn't exist yet, bail out gracefully
    request.onupgradeneeded = () => {
      request.transaction.abort();
      reject(new Error('DB not yet initialised'));
    };
  });
}

function dbGet(database, storeName, key) {
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function dbPut(database, storeName, record) {
  return new Promise((resolve, reject) => {
    try {
      const tx = database.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

function getLocalDateStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

// ─── Core reminder logic (shared by periodic sync and push from app) ─────────
async function checkAndShowReminder() {
  try {
    const database = await openDB();

    const enabledSetting = await dbGet(database, 'settings', 'reminderEnabled');
    if (!enabledSetting?.value) return;

    const timeSetting = await dbGet(database, 'settings', 'reminderTime');
    const reminderTime = timeSetting?.value ?? '20:00';

    const today = getLocalDateStr();

    // Skip if the user has already logged today
    const todayLog = await dbGet(database, 'logs', today);
    if (todayLog) return;

    // Skip if we already sent the reminder today
    const lastNotified = await dbGet(database, 'settings', 'lastReminderDate');
    if (lastNotified?.value === today) return;

    // Only notify after the configured reminder time
    const now = new Date();
    const [hours, minutes] = reminderTime.split(':').map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);
    if (now < reminderDate) return;

    await self.registration.showNotification('Timental Reminder', {
      body: "Don't forget to log your mental health for today!",
      icon: '/timental/pwa-192x192.png',
      badge: '/timental/pwa-192x192.png',
      tag: 'daily-reminder',
      renotify: false,
    });

    // Record that we notified today so we don't fire again
    await dbPut(database, 'settings', { key: 'lastReminderDate', value: today });
  } catch (err) {
    // Fail silently — the SW must not throw unhandled errors
    console.error('[SW] checkAndShowReminder error:', err);
  }
}
