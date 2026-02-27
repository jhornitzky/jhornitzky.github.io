import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, dbHelpers, CRITERIA } from '../db';
import { getToday, formatDisplayDate } from '../utils/helpers';
import { ChevronLeft, Save } from 'lucide-react';

function LogScreen() {
  const navigate = useNavigate();
  const { date: paramDate } = useParams();
  const selectedDate = paramDate || getToday();

  const [score, setScore] = useState(null);
  const [criteriaMet, setCriteriaMet] = useState([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing entry if available
  useEffect(() => {
    async function loadEntry() {
      setIsLoading(true);
      const entry = await dbHelpers.getLog(selectedDate);
      if (entry) {
        setScore(entry.score);
        setCriteriaMet(entry.criteriaMet || []);
        setNotes(entry.notes || '');
      }
      setIsLoading(false);
    }
    loadEntry();
  }, [selectedDate]);

  const handleScoreSelect = (selectedScore) => {
    setScore(selectedScore);
  };

  const handleCriteriaToggle = (criteriaId) => {
    setCriteriaMet(prev => {
      if (prev.includes(criteriaId)) {
        return prev.filter(id => id !== criteriaId);
      } else {
        return [...prev, criteriaId];
      }
    });
  };

  const handleSave = async () => {
    if (score === null) {
      alert('Please select a score before saving');
      return;
    }

    setIsSaving(true);
    try {
      await dbHelpers.saveLog(selectedDate, score, criteriaMet, notes);
      navigate('/');
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Check In</h1>
            <p className="text-sm text-gray-600">{formatDisplayDate(selectedDate)}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        {/* Score Selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            How was your day out of 10?
          </h2>

          <div className="w-full">
            <select
              value={score === null ? '' : score}
              onChange={(e) => handleScoreSelect(e.target.value === '' ? null : parseInt(e.target.value))}
              className={`w-36 p-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-mood-good focus:border-mood-good font-bold text-lg transition-colors duration-300 ${score === null ? 'bg-white' : score < 5 ? 'bg-mood-bad text-white' : 'bg-mood-good text-white'
                }`}
            >
              <option value="" disabled>Select...</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num} className="bg-white text-gray-900">{num}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Criteria Checklist */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            What did you do?
          </h2>

          <div className="space-y-2">
            {CRITERIA.map((criteria) => (
              <label
                key={criteria.id}
                className="checkbox-item"
              >
                <input
                  type="checkbox"
                  checked={criteriaMet.includes(criteria.id)}
                  onChange={() => handleCriteriaToggle(criteria.id)}
                />
                <span className="text-gray-900 flex-1">{criteria.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Any thoughts or notes about today?
          </h2>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[120px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mood-good focus:border-transparent resize-none"
            placeholder="Write your thoughts here..."
          />
        </section>
      </main>

      {/* Sticky Save Button */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving || score === null}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </div>
  );
}

export default LogScreen;
