import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dbHelpers, CRITERIA } from '../db';
import { downloadJSON, readJSONFile, calculateCriteriaPercentage, formatDate, getHeatmapColor, getDateRange } from '../utils/helpers';
import { Download, Upload, Trash2, AlertCircle, Check } from 'lucide-react';

function ReportsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // Get last 30 days of logs
  const logs = useLiveQuery(
    () => dbHelpers.getLastNDaysLogs(30),
    []
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await dbHelpers.exportData();
      const filename = `timental-backup-${formatDate(new Date())}.json`;
      downloadJSON(data, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await readJSONFile(file);
      const result = await dbHelpers.importData(data);
      if (result.success) {
        alert('Data imported successfully!');
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import data. Please check the file format.');
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleClearData = async () => {
    try {
      await dbHelpers.clearAllData();
      setShowDeleteConfirm(false);
      alert('All data cleared successfully');
    } catch (error) {
      console.error('Clear data error:', error);
      alert('Failed to clear data');
    }
  };

  // Prepare chart data for line chart
  const chartData = logs ? logs.map(log => ({
    date: new Date(log.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score: log.score,
  })).reverse() : [];

  // Prepare grid data (all last 30 days, most recent first)
  const gridDates = getDateRange(30, 0).slice().reverse();
  const logsMap = {};
  if (logs) {
    logs.forEach(log => {
      logsMap[log.date] = log;
    });
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600">Last 30 days</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        {logs && logs.length > 0 ? (
          <>

            {/* Score Trend Chart */}
            <section className="bg-white rounded-lg p-4 shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How you rated each day</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 10]}
                      ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                      interval={0}
                      tick={{ fontSize: 10 }}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Contribution Grid */}
            <section className="bg-white rounded-lg p-4 shadow-sm mb-6 overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What you did each day</h3>

              <div className="overflow-x-auto -mx-4 px-4 pb-2">
                <div className="min-w-[800px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-20 bg-white text-left text-xs font-bold text-gray-400 uppercase tracking-wider py-2 pr-4 border-b border-gray-100 min-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          Habit / Date
                        </th>
                        {gridDates.map(date => (
                          <th key={date} className="text-center text-[10px] font-bold text-gray-500 py-2 px-1 border-b border-gray-100 min-w-[40px]">
                            {(() => {
                              const d = new Date(date + 'T00:00:00');
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            })()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Score Row */}
                      <tr className="bg-gray-50/50">
                        <td className="sticky left-0 z-10 bg-gray-50 text-xs font-bold text-gray-700 py-3 pr-4 border-b border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          Daily Score
                        </td>
                        {gridDates.map(date => {
                          const log = logsMap[date];
                          const hasAllCriteria = log?.criteriaMet?.length === 11;
                          const color = log ? getHeatmapColor(log.score, hasAllCriteria) : 'bg-gray-100/50';
                          return (
                            <td key={date} className="py-2 px-1 border-b border-gray-100">
                              <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-black text-gray-800 ${color}`}>
                                {log?.score || '-'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Criteria Rows */}
                      {CRITERIA.map((criteria, idx) => (
                        <tr key={criteria.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className={`sticky left-0 z-10 text-xs font-semibold text-gray-600 py-2.5 pr-4 border-b border-gray-50 whitespace-nowrap overflow-hidden text-ellipsis shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            {criteria.label}
                          </td>
                          {gridDates.map(date => {
                            const log = logsMap[date];
                            const isMet = log?.criteriaMet?.includes(criteria.id);
                            return (
                              <td key={date} className="py-2 px-1 border-b border-gray-50">
                                <div className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-colors ${isMet ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-transparent'}`}>
                                  <Check size={14} strokeWidth={4} />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </section>
          </>
        ) : (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm mb-6">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No data yet</h3>
            <p className="text-gray-600">Start logging your daily entries to see insights here.</p>
          </div>
        )}

        {/* Data Management */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage your data</h3>

          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Download size={20} />
              {isExporting ? 'Exporting...' : 'Download Backup (.json)'}
            </button>

            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Upload size={20} />
              {isImporting ? 'Importing...' : 'Restore from File'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-red-50 text-red-600 px-6 py-3 rounded-lg font-medium border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors flex items-center justify-center gap-2 touch-target"
              >
                <Trash2 size={20} />
                Clear All Data
              </button>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 mb-3 font-medium">
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearData}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 active:bg-red-800 transition-colors"
                  >
                    Yes, Delete All
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            All data is stored locally in your browser. Export regularly to keep backups.
          </p>
        </section>
      </main>
    </div>
  );
}

export default ReportsScreen;
