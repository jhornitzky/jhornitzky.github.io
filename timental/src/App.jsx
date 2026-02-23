import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import LogScreen from './screens/LogScreen';
import ReportsScreen from './screens/ReportsScreen';
import { Home, PlusCircle, BarChart3 } from 'lucide-react';

function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/log', icon: PlusCircle, label: 'Log' },
    { path: '/reports', icon: BarChart3, label: 'Reports' }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 active:text-gray-700'
              }`}
            >
              <Icon size={24} className="mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen pb-16">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogScreen />} />
          <Route path="/log/:date" element={<LogScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
