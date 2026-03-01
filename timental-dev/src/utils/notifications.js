import { dbHelpers } from '../db';
import { getToday, showNotification, requestNotificationPermission } from './helpers';

// Module-level guard — prevents duplicate intervals if Dashboard remounts
let reminderIntervalId = null;

// Check if we should show a reminder (runs while the app is open)
export async function checkAndShowReminder() {
  const reminderEnabled = await dbHelpers.getSetting('reminderEnabled', false);
  if (!reminderEnabled) return;

  const reminderTime = await dbHelpers.getSetting('reminderTime', '20:00');
  const today = getToday();

  // Skip if the user has already logged today
  const todayLog = await dbHelpers.getLog(today);
  if (todayLog) return;

  // Skip if we already sent the reminder today (also checked in the SW)
  const lastReminderDate = await dbHelpers.getSetting('lastReminderDate', null);
  if (lastReminderDate === today) return;

  // Only notify after the configured reminder time
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);
  if (now < reminderDate) return;

  await showNotification('Timental Reminder', {
    body: "Don't forget to log your mental health for today!",
    tag: 'daily-reminder',
    requireInteraction: false
  });

  // Record that we notified today so the SW doesn't fire again
  await dbHelpers.setSetting('lastReminderDate', today);
}

// Register Periodic Background Sync so the SW can check reminders
// even when the app is closed (Android Chrome only; iOS falls back gracefully)
async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      await registration.periodicSync.register('daily-reminder', {
        minInterval: 60 * 60 * 1000 // browser may enforce a longer minimum
      });
    }
  } catch (err) {
    // periodicSync may be unavailable (iOS, desktop browsers without the flag)
    console.warn('Periodic Background Sync not available:', err);
  }
}

async function unregisterPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      await registration.periodicSync.unregister('daily-reminder');
    }
  } catch (err) {
    console.warn('Could not unregister Periodic Sync:', err);
  }
}

// Schedule daily reminder check while the app is open
export function scheduleDailyReminderCheck() {
  // Guard against duplicate intervals caused by component remounts
  if (reminderIntervalId !== null) return;

  // Check every 15 minutes while the app is open (fallback for when SW sync isn't available)
  reminderIntervalId = setInterval(checkAndShowReminder, 15 * 60 * 1000);

  // Also check immediately on app load
  checkAndShowReminder();
}

// Enable notifications
export async function enableNotifications(reminderTime = '20:00') {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return { success: false, error: 'Permission denied' };
  }

  await dbHelpers.setSetting('reminderEnabled', true);
  await dbHelpers.setSetting('reminderTime', reminderTime);

  await registerPeriodicSync();
  scheduleDailyReminderCheck();

  return { success: true };
}

// Disable notifications
export async function disableNotifications() {
  await dbHelpers.setSetting('reminderEnabled', false);
  await unregisterPeriodicSync();

  // Clear the in-app interval
  if (reminderIntervalId !== null) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }

  return { success: true };
}

// Get notification settings
export async function getNotificationSettings() {
  const enabled = await dbHelpers.getSetting('reminderEnabled', false);
  const time = await dbHelpers.getSetting('reminderTime', '20:00');

  return { enabled, time };
}

// Send a test notification immediately
export async function sendTestNotification() {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return { success: false, error: 'Permission denied' };
  }

  await showNotification('Timental Test', {
    body: 'This is a test notification from Timental!',
    tag: 'test-notification'
  });

  return { success: true };
}
