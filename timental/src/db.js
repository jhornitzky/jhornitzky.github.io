import Dexie from 'dexie';

// Define the 11 mental health criteria
export const CRITERIA = [
  { id: 'work', label: 'Enjoyed work, or not work?' },
  { id: 'financial', label: 'Feel financially ok?' },
  { id: 'community', label: 'Did something with a community?' },
  { id: 'exercise', label: 'Exercised?' },
  { id: 'healthy_food', label: 'Ate healthy food?' },
  { id: 'sleep', label: 'Slept well?' },
  { id: 'social', label: 'Fun with family or friends?' },
  { id: 'respect', label: 'I was treated with respect.' },
  { id: 'joy', label: 'I smiled and laughed a lot.' },
  { id: 'rested', label: 'I felt well-rested.' },
  { id: 'learning', label: 'I learned something new.' }
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

  // Get last N days of logs
  async getLastNDaysLogs(days) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
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
