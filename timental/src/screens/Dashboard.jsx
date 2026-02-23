import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, dbHelpers } from '../db';
import { getDateRange, getHeatmapColor, formatDate, getToday } from '../utils/helpers';
import { scheduleDailyReminderCheck } from '../utils/notifications';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';

function Dashboard() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const todayRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Get logs from database (reactive)
  const logs = useLiveQuery(
    () => dbHelpers.getLastNDaysLogs(90),
    []
  );
  
  // Generate 90 days of dates
  const dates = getDateRange(90);
  
  // Create a map for quick lookup
  const logsMap = {};
  if (logs) {
    logs.forEach(log => {
      logsMap[log.date] = log;
    });
  }
  
  // Auto-scroll to today on component mount
  useEffect(() => {
    if (todayRef.current && scrollContainerRef.current) {
      setTimeout(() => {
        todayRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
    }
    
    // Initialize notification checking
    scheduleDailyReminderCheck();
  }, [logs]);
  
  const handleDayClick = (date) => {
    navigate(`/log/${date}`);
  };
  
  const today = getToday();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timental</h1>
            <p className="text-sm text-gray-600">Your private, daily mental health pulse</p>
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
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Last 90 Days</h2>
          <p className="text-sm text-gray-600">
            Tap any day to view or edit your entry
          </p>
        </div>
        
        {/* Heatmap - Horizontal Scroll */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto pb-4 -mx-4 px-4"
        >
          <div className="inline-flex gap-1.5 min-w-full">
            {dates.map((date) => {
              const log = logsMap[date];
              const hasAllCriteria = log && log.criteriaMet?.length === 11;
              const colorClass = getHeatmapColor(log?.score, hasAllCriteria);
              const isToday = date === today;
              
              return (
                <div
                  key={date}
                  ref={isToday ? todayRef : null}
                  onClick={() => handleDayClick(date)}
                  className={`heatmap-cell flex-shrink-0 w-12 h-12 ${colorClass} flex items-center justify-center relative ${
                    isToday ? 'ring-2 ring-primary-600' : ''
                  }`}
                  title={date}
                >
                  <span className="text-xs font-medium text-gray-700">
                    {new Date(date + 'T00:00:00').getDate()}
                  </span>
                  {hasAllCriteria && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded"></div>
              <span className="text-sm text-gray-600">No entry</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-200 rounded"></div>
              <span className="text-sm text-gray-600">Low mood (1-3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-300 rounded"></div>
              <span className="text-sm text-gray-600">Medium mood (4-6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">High mood (7-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded ring-2 ring-blue-400 relative">
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              </div>
              <span className="text-sm text-gray-600">All 11 criteria met</span>
            </div>
          </div>
        </div>
        
        {/* Quick Action */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/log')}
            className="w-full btn-primary"
          >
            Log Today's Entry
          </button>
        </div>
        
        {/* Stats Summary */}
        {logs && logs.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-primary-600">
                {logs.length}
              </div>
              <div className="text-sm text-gray-600">Days logged</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-primary-600">
                {Math.round(logs.reduce((sum, log) => sum + (log.score || 0), 0) / logs.length * 10) / 10}
              </div>
              <div className="text-sm text-gray-600">Average score</div>
            </div>
          </div>
        )}
      </main>
      
      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default Dashboard;
