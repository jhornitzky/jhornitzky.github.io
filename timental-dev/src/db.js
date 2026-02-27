import Dexie from 'dexie';

// Define the 11 mental health criteria
export const CRITERIA = [
  { id: 'work', label: 'I enjoyed work', icon: 'Briefcase' },
  { id: 'financial', label: 'I felt financially ok', icon: 'Wallet' },
  { id: 'community', label: 'I did something with a community', icon: 'Users' },
  { id: 'exercise', label: 'I exercised', icon: 'Dumbbell' },
  { id: 'healthy_food', label: 'I ate healthy food', icon: 'Apple' },
  { id: 'sleep', label: 'I slept well last night', icon: 'Moon' },
  { id: 'social', label: 'I had fun with family or friends', icon: 'Heart' },
  { id: 'respect', label: 'I was treated with respect', icon: 'ShieldCheck' },
  { id: 'joy', label: 'I smiled and laughed a lot', icon: 'Sun' },
  { id: 'rested', label: 'I felt well-rested', icon: 'Battery' },
  { id: 'learning', label: 'I learned something new', icon: 'GraduationCap' }
];

// Initialize Dexie database
class TimentalDB extends Dexie {
  constructor() {
    super('TimentalDB');

    this.version(1).stores({
      logs: 'date, score, criteriaMet, notes',
      settings: 'key, value'
    });

    this.logs = this.table('logs');
    this.settings = this.table('settings');
  }
}

// Create database instance
export const db = new TimentalDB();

// Helper functions for database operations
export const dbHelpers = {
  // Get or create a log entry for a specific date
  async getLog(date) {
    return await db.logs.get(date);
  },

  // Save or update a log entry
  async saveLog(date, score, criteriaMet, notes = '') {
    return await db.logs.put({
      date,
      score,
      criteriaMet,
      notes,
      updatedAt: new Date().toISOString()
    });
  },

  // Get logs for a date range
  async getLogsInRange(startDate, endDate) {
    return await db.logs
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  // Get N days of logs with optional offset
  async getLastNDaysLogs(days, offsetDays = 0) {
    const endDateObj = new Date();
    endDateObj.setDate(endDateObj.getDate() - offsetDays);
    const endDate = endDateObj.toISOString().split('T')[0];

    const startDate = new Date(endDateObj);
    startDate.setDate(startDate.getDate() - (days - 1));
    const startDateStr = startDate.toISOString().split('T')[0];

    return await this.getLogsInRange(startDateStr, endDate);
  },

  // Export all data to JSON
  async exportData() {
    const logs = await db.logs.toArray();
    const settings = await db.settings.toArray();

    return {
      version: 1,
      exportDate: new Date().toISOString(),
      logs,
      settings
    };
  },

  // Import data from JSON
  async importData(data) {
    try {
      if (data.logs) {
        await db.logs.bulkPut(data.logs);
      }
      if (data.settings) {
        await db.settings.bulkPut(data.settings);
      }
      return { success: true };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, error: error.message };
    }
  },

  // Clear all data
  async clearAllData() {
    await db.logs.clear();
    await db.settings.clear();
  },

  // Get or set a setting
  async getSetting(key, defaultValue = null) {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
  },

  async setSetting(key, value) {
    return await db.settings.put({ key, value });
  }
};
