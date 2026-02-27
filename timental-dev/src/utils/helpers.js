// Format date to YYYY-MM-DD
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Get today's date as YYYY-MM-DD
export function getToday() {
  return formatDate(new Date());
}

// Parse YYYY-MM-DD to Date object
export function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

// Format date for display (e.g., "Tuesday, Oct 24")
export function formatDisplayDate(dateStr) {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

// Get date range for N days with optional offset
export function getDateRange(days, offsetDays = 0) {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (offsetDays + i));
    dates.push(formatDate(date));
  }

  return dates.reverse(); // Return in chronological order
}

// Get color for heatmap based on score
export function getHeatmapColor(score, hasAllCriteria = false) {
  if (!score) return 'bg-gray-100';

  // Yellowish for < 5, Greenish for >= 5
  const color = score < 5 ? 'bg-mood-bad' : 'bg-mood-good';

  return hasAllCriteria ? color + ' ring-2 ring-white' : color;
}

// Download data as JSON file
export function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Read JSON file from input
export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Calculate percentage of criteria met
export function calculateCriteriaPercentage(criteriaMet, totalCriteria = 11) {
  if (!criteriaMet || criteriaMet.length === 0) return 0;
  return Math.round((criteriaMet.length / totalCriteria) * 100);
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show a notification
export function showNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    });
  }
}

// Check if there's a log for today
export function checkTodayLog(logs, today) {
  return logs.some(log => log.date === today);
}
