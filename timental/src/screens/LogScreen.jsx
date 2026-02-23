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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Entry</h1>
            <p className="text-sm text-gray-600">{formatDisplayDate(selectedDate)}</p>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        {/* Score Selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            How was your mental health today?
          </h2>
          <p className="text-sm text-gray-600 mb-4">Rate from 1 (worst) to 10 (best)</p>
          
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => handleScoreSelect(num)}
                className={`score-button ${
                  score === num ? 'selected' : ''
                } ${
                  num <= 3 ? 'bg-red-100 hover:bg-red-200 text-red-700' :
                  num <= 6 ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' :
                  'bg-green-100 hover:bg-green-200 text-green-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </section>
        
        {/* Criteria Checklist */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Daily Health Criteria
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Check all that apply to today ({criteriaMet.length}/11)
          </p>
          
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
            Reflection (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Any thoughts or notes about today?
          </p>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[120px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
