import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { getNotificationSettings, enableNotifications, disableNotifications } from '../utils/notifications';

function SettingsModal({ isOpen, onClose }) {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    async function loadSettings() {
      const settings = await getNotificationSettings();
      setReminderEnabled(settings.enabled);
      setReminderTime(settings.time);
    }
    
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);
  
  const handleToggleReminder = async (enabled) => {
    setIsSaving(true);
    try {
      if (enabled) {
        const result = await enableNotifications(reminderTime);
        if (result.success) {
          setReminderEnabled(true);
        } else {
          alert('Please enable notifications in your browser settings');
        }
      } else {
        await disableNotifications();
        setReminderEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
      alert('Failed to update reminder settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTimeChange = async (newTime) => {
    setReminderTime(newTime);
    if (reminderEnabled) {
      await enableNotifications(newTime);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Daily Reminder */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <Bell size={20} className="text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Daily Reminder</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable reminders</p>
                  <p className="text-xs text-gray-600">Get notified to log your daily entry</p>
                </div>
                <button
                  onClick={() => handleToggleReminder(!reminderEnabled)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    reminderEnabled ? 'bg-primary-600' : 'bg-gray-300'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {reminderEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Reminder time
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </section>
          
          {/* About */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Timental</strong> - Your private, daily mental health pulse</p>
              <p>Version 1.0.0</p>
              <p className="text-xs">All your data is stored locally in your browser and never sent anywhere.</p>
            </div>
          </section>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
