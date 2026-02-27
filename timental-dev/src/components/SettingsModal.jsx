import { useState, useEffect } from 'react';
import { X, Bell, Info, Send } from 'lucide-react';
import { getNotificationSettings, enableNotifications, disableNotifications, sendTestNotification } from '../utils/notifications';
import { isStandalone } from '../utils/helpers';

function SettingsModal({ isOpen, onClose }) {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getNotificationSettings();
      setReminderEnabled(settings.enabled);
      setReminderTime(settings.time);
      setStandalone(isStandalone());
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

  const handleSendTest = async () => {
    setIsTesting(true);
    try {
      const result = await sendTestNotification();
      if (!result.success) {
        alert(result.error || 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Error sending test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const handleTimeChange = async (newTime) => {
    setReminderTime(newTime);
    if (reminderEnabled) {
      await enableNotifications(newTime);
    }
  };

  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
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
              <Bell size={20} className="text-mood-good" />
              <h3 className="text-lg font-semibold text-gray-900">Daily Reminder</h3>
            </div>

            {isIOS && !standalone && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-1">iOS Setup Required</p>
                  <p>To receive notifications on iPhone, you must add this app to your Home Screen: tap the <strong>Share</strong> icon and then <strong>"Add to Home Screen"</strong>.</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable reminders</p>
                  <p className="text-xs text-gray-600">Get notified to log your daily entry</p>
                </div>
                <button
                  onClick={() => handleToggleReminder(!reminderEnabled)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reminderEnabled ? 'bg-mood-good' : 'bg-gray-300'
                    } ${isSaving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              {reminderEnabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Reminder time
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mood-good focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={handleSendTest}
                    disabled={isTesting}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200 disabled:opacity-50"
                  >
                    <Send size={16} />
                    {isTesting ? 'Sending...' : 'Send Test Notification'}
                  </button>
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
