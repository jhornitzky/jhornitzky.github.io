import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dbHelpers } from '../db';
import { downloadJSON, readJSONFile, calculateCriteriaPercentage, formatDate } from '../utils/helpers';
import { Download, Upload, Trash2, AlertCircle } from 'lucide-react';

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
  
  // Prepare chart data
  const chartData = logs ? logs.map(log => ({
    date: new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: log.score,
    criteriaPercentage: calculateCriteriaPercentage(log.criteriaMet)
  })).reverse() : [];
  
  // Calculate statistics
  const stats = logs ? {
    totalEntries: logs.length,
    avgScore: logs.length > 0 ? (logs.reduce((sum, log) => sum + (log.score || 0), 0) / logs.length).toFixed(1) : 0,
    avgCriteria: logs.length > 0 ? Math.round(logs.reduce((sum, log) => sum + (log.criteriaMet?.length || 0), 0) / logs.length) : 0,
    bestDay: logs.reduce((best, log) => (log.score > (best?.score || 0) ? log : best), null),
    worstDay: logs.reduce((worst, log) => (log.score < (worst?.score || 10) && log.score > 0 ? log : worst), null)
  } : null;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Insights</h1>
          <p className="text-sm text-gray-600">Last 30 days overview</p>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        {logs && logs.length > 0 ? (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-primary-600">{stats.totalEntries}</div>
                <div className="text-sm text-gray-600">Days logged</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-primary-600">{stats.avgScore}</div>
                <div className="text-sm text-gray-600">Average score</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-primary-600">{stats.avgCriteria}</div>
                <div className="text-sm text-gray-600">Avg criteria met</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{stats.bestDay?.score || 'N/A'}</div>
                <div className="text-sm text-gray-600">Best score</div>
              </div>
            </div>
            
            {/* Score Trend Chart */}
            <section className="bg-white rounded-lg p-4 shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mental Health Score Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={[0, 10]}
                      tick={{ fontSize: 12 }}
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
            
            {/* Criteria Completion Chart */}
            <section className="bg-white rounded-lg p-4 shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Criteria Completion %</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar 
                      dataKey="criteriaPercentage" 
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
          
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
