import { useState, useEffect } from 'react';
import { X, Bell, CalendarPlus } from 'lucide-react';
import { getCalendarSettings, saveCalendarTime, downloadCalendarReminder, getGoogleCalendarUrl, getOutlookCalendarUrl } from '../utils/notifications';

function SettingsModal({ isOpen, onClose }) {
  const [reminderTime, setReminderTime] = useState('20:00');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getCalendarSettings().then(({ time }) => setReminderTime(time));
    }
  }, [isOpen]);

  const handleTimeChange = (newTime) => {
    setReminderTime(newTime);
    saveCalendarTime(newTime);
  };

  const handleAddToCalendar = () => {
    setIsAdding(true);
    downloadCalendarReminder(reminderTime);
    setTimeout(() => setIsAdding(false), 1500);
  };

  if (!isOpen) return null;

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

            <p className="text-xs text-gray-500 mb-4">
              Add a repeating daily reminder to your calendar app.
            </p>

            <div className="space-y-4">
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

              <div className="space-y-2">
                <button
                  onClick={handleAddToCalendar}
                  disabled={isAdding}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200 disabled:opacity-50"
                >
                  <CalendarPlus size={16} />
                  {isAdding ? 'Opening calendar...' : 'Apple / ICS Calendar'}
                </button>

                <div className="flex flex-col gap-2">
                  <a
                    href={getGoogleCalendarUrl(reminderTime)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                  >
                    Google Calendar
                  </a>
                  <a
                    href={getOutlookCalendarUrl(reminderTime)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                  >
                    Outlook
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Timental</strong> - Your private, daily mental health check in</p>
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
