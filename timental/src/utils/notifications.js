import { dbHelpers } from '../db';
import { getToday, showNotification, requestNotificationPermission } from './helpers';

// Check if we should show a reminder
export async function checkAndShowReminder() {
  const reminderEnabled = await dbHelpers.getSetting('reminderEnabled', false);
  if (!reminderEnabled) return;
  
  const reminderTime = await dbHelpers.getSetting('reminderTime', '20:00');
  const today = getToday();
  
  // Check if there's already a log for today
  const todayLog = await dbHelpers.getLog(today);
  if (todayLog) return; // Already logged today
  
  // Check if it's time for the reminder
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);
  
  // If current time is past the reminder time and we haven't logged yet
  if (now >= reminderDate) {
    showNotification('Timental Reminder', {
      body: 'Don\'t forget to log your mental health for today!',
      tag: 'daily-reminder',
      requireInteraction: false
    });
  }
}

// Schedule daily reminder check
export function scheduleDailyReminderCheck() {
  // Check every hour if we should show a reminder
  setInterval(checkAndShowReminder, 60 * 60 * 1000); // Check every hour
  
  // Also check on app load
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
  
  scheduleDailyReminderCheck();
  
  return { success: true };
}

// Disable notifications
export async function disableNotifications() {
  await dbHelpers.setSetting('reminderEnabled', false);
  return { success: true };
}

// Get notification settings
export async function getNotificationSettings() {
  const enabled = await dbHelpers.getSetting('reminderEnabled', false);
  const time = await dbHelpers.getSetting('reminderTime', '20:00');
  
  return { enabled, time };
}
