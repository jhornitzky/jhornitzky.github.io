import { dbHelpers } from '../db';

const DEFAULT_TIME = '20:00';

// Persist the chosen time so the UI remembers it across sessions
export async function getCalendarSettings() {
  const time = await dbHelpers.getSetting('calendarReminderTime', DEFAULT_TIME);
  return { time };
}

export async function saveCalendarTime(time) {
  await dbHelpers.setSetting('calendarReminderTime', time);
}

// Generate and trigger download of a recurring daily .ics reminder
export function downloadCalendarReminder(time = DEFAULT_TIME) {
  const [hours, minutes] = time.split(':').map(Number);

  // Start from today using local (floating) time — no TZID needed
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate());
  const timeStr = pad(hours) + pad(minutes) + '00';

  const uid = `timental-reminder-${Date.now()}@timental`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Timental//Timental//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${dateStr}T${timeStr}`,
    `DTEND:${dateStr}T${timeStr}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:Log your Timental entry',
    'DESCRIPTION:Time to check in on your mental health today.',
    'BEGIN:VALARM',
    'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:Log your Timental entry',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timental-reminder.ics';
  a.click();
  URL.revokeObjectURL(url);
}
