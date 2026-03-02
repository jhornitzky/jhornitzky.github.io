import { dbHelpers } from '../db';

const DEFAULT_TIME = '20:00';
const APP_URL = 'https://jhornitzky.github.io/timental/';

// Persist the chosen time so the UI remembers it across sessions
export async function getCalendarSettings() {
  const time = await dbHelpers.getSetting('calendarReminderTime', DEFAULT_TIME);
  return { time };
}

export async function saveCalendarTime(time) {
  await dbHelpers.setSetting('calendarReminderTime', time);
}

// Build shared date/time parts used by all calendar helpers
function buildDateParts(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = pad(hours) + pad(minutes) + '00';
  const isoTime = `${pad(hours)}:${pad(minutes)}:00`;
  return { hours, minutes, dateStr, isoDate, timeStr, isoTime, pad };
}

export function getGoogleCalendarUrl(time = DEFAULT_TIME) {
  const { hours, minutes, dateStr, timeStr, pad } = buildDateParts(time);
  const totalEnd = hours * 60 + minutes + 5;
  const endStr = pad(Math.floor(totalEnd / 60) % 24) + pad(totalEnd % 60) + '00';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Log your Timental entry',
    details: `Time to check in on your mental health today.\n${APP_URL}`,
    dates: `${dateStr}T${timeStr}/${dateStr}T${endStr}`,
    recur: 'RRULE:FREQ=DAILY',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(time = DEFAULT_TIME) {
  const { hours, minutes, isoDate, isoTime, pad } = buildDateParts(time);
  const totalEnd = hours * 60 + minutes + 5;
  const endIsoTime = `${pad(Math.floor(totalEnd / 60) % 24)}:${pad(totalEnd % 60)}:00`;
  const params = new URLSearchParams({
    subject: 'Log your Timental entry',
    body: `Time to check in on your mental health today. ${APP_URL}`,
    startdt: `${isoDate}T${isoTime}`,
    enddt: `${isoDate}T${endIsoTime}`,
    path: '/calendar/action/compose',
    rru: 'addevent',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
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
    `DESCRIPTION:Time to check in on your mental health today. ${APP_URL}`,
    `URL:${APP_URL}`,
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
