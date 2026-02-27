import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, dbHelpers } from '../db';
import { getDateRange, getHeatmapColor, getToday, formatDisplayDate, calculateCriteriaPercentage } from '../utils/helpers';
import { scheduleDailyReminderCheck } from '../utils/notifications';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';

function Dashboard() {
  const navigate = useNavigate();
  const todayRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleDays, setVisibleDays] = useState(90);
  const DAYS_INCREMENT = 90;

  // Get logs from database (reactive)
  const logs = useLiveQuery(
    () => dbHelpers.getLastNDaysLogs(visibleDays, 0),
    [visibleDays]
  );

  // Generate all visible dates
  const dates = getDateRange(visibleDays, 0).reverse();

  // Create a map for quick lookup
  const logsMap = {};
  if (logs) {
    logs.forEach(log => {
      logsMap[log.date] = log;
    });
  }

  // Handle loading more
  const loadMore = () => setVisibleDays(prev => prev + DAYS_INCREMENT);

  // Initialize notification checking
  useEffect(() => {
    scheduleDailyReminderCheck();
  }, []);

  const handleDayClick = (date) => {
    navigate(`/log/${date}`);
  };

  const today = getToday();
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900">Timental</h1>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">

        {/* Days Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {dates.map((date) => {
            const log = logsMap[date];
            const hasAllCriteria = log && log.criteriaMet?.length === 11;
            const colorClass = getHeatmapColor(log?.score, hasAllCriteria);
            const isToday = date === today;
            const percentage = calculateCriteriaPercentage(log?.criteriaMet);
            const dateYear = parseInt(date.split('-')[0]);
            const isDifferentYear = dateYear !== currentYear;

            return (
              <div
                key={date}
                ref={isToday ? todayRef : null}
                onClick={() => handleDayClick(date)}
                className={`bg-white rounded-lg p-3 shadow-sm flex flex-col justify-center cursor-pointer relative hover:shadow-md transition-shadow h-28 ${isToday ? 'ring-2 ring-primary-600 ring-opacity-50' : ''
                  }`}
              >
                {/* Visual score indicator bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-lg ${colorClass}`}></div>

                <div className="flex items-center gap-4 h-full relative z-0">
                  {/* Large Score on Left */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colorClass} shadow-sm relative`}>
                    <span className="text-2xl font-black text-gray-800">
                      {log?.score ? log.score : '-'}
                    </span>
                    {hasAllCriteria && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                    )}
                  </div>

                  {/* Date and Details on Right */}
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="text-base font-bold text-gray-900 leading-tight truncate">
                      {isToday ? 'Today' : formatDisplayDate(date).split(',')[0]}
                    </h3>
                    <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap overflow-hidden">
                      {formatDisplayDate(date).split(',')[1]?.trim()}
                      {isDifferentYear && <span className="ml-1 opacity-75">{dateYear}</span>}
                    </div>

                    <div className="mt-1.5 text-xs">
                      {log ? (
                        <div className="inline-flex px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-semibold text-gray-600">
                          {percentage}%
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">No entry</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        <div className="mt-8 pb-12">
          <button
            onClick={loadMore}
            className="w-full py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
          >
            Show Older History (+90 Days)
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default Dashboard;
