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

  // Handle scroll restoration for dashboard
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('dashboardScrollPos');
    const prevPath = sessionStorage.getItem('prevPath');

    // Only restore scroll if returning from a log entry
    const isFromLog = prevPath && prevPath.startsWith('/log');

    if (isFromLog && savedScrollPos) {
      // Use a small timeout to ensure the DOM has rendered enough height
      const timer = setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos, 10));
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // If coming from reports or elsewhere, always go to top
      window.scrollTo(0, 0);
    }

    const handleScroll = () => {
      // Only save if we're actually on the dashboard path
      if (window.location.hash === '#/') {
        sessionStorage.setItem('dashboardScrollPos', window.scrollY.toString());
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <img
              src="logo.png"
              alt="Timental Logo"
              className="h-8 w-auto object-contain"
            />
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
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
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
                className={`${colorClass} rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-pointer relative hover:shadow-md transition-all h-28 ${isToday ? 'ring-2 ring-white ring-offset-2' : ''
                  }`}
              >
                {/* Large Score on Left */}
                <div className="flex flex-col items-center justify-center shrink-0 min-w-[4rem]">
                  <span className={`text-5xl font-black leading-none ${log ? 'text-white' : 'text-gray-900'}`}>
                    {log?.score ? log.score : '-'}
                  </span>
                  {hasAllCriteria && (
                    <div className="mt-2 w-3 h-3 bg-white rounded-full border-2 border-white shadow-sm"></div>
                  )}
                </div>

                {/* Date and Details on Right */}
                <div className="flex flex-col justify-center min-w-0">
                  <h3 className={`text-lg font-bold leading-tight ${log ? 'text-white' : 'text-gray-900'}`}>
                    {isToday ? 'Today' : formatDisplayDate(date)}
                  </h3>
                  {isDifferentYear && <span className={`text-xs font-bold mt-0.5 ${log ? 'text-white opacity-80' : 'text-gray-700 opacity-60'}`}>{dateYear}</span>}

                  <div className="mt-2">
                    {log ? (
                      <div className="text-xs font-bold text-white opacity-90">
                        {percentage}%
                      </div>
                    ) : (
                      <span className="text-xs text-gray-700 opacity-60 italic">No entry</span>
                    )}
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
