import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AddCow from './pages/AddCow';
import CowsList from './pages/CowsList';
import CowDetails from './pages/CowDetails';
import CowPublicProfile from './pages/CowPublicProfile';
import MonitoringDashboard from './pages/MonitoringDashboard';
import MonitoringCowList from './pages/MonitoringCowList';
import MonitoringCowDetail from './pages/MonitoringCowDetail';
import DailySummary from './pages/DailySummary';
import HistoryLog from './pages/HistoryLog';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-cow"
            element={
              <ProtectedRoute>
                <AddCow />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cows"
            element={
              <ProtectedRoute>
                <CowsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cow-details/:cowId"
            element={
              <ProtectedRoute>
                <CowDetails />
              </ProtectedRoute>
            }
          />
          {/* Public read-only route for QR code access */}
          <Route path="/cow/:cowId" element={<CowPublicProfile />} />
          <Route path="/cow" element={<CowPublicProfile />} />
          {/* Monitoring Module Routes */}
          <Route
            path="/monitoring"
            element={
              <ProtectedRoute>
                <MonitoringDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring/cows"
            element={
              <ProtectedRoute>
                <MonitoringCowList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring/cows/:cowId"
            element={
              <ProtectedRoute>
                <MonitoringCowDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring/summary"
            element={
              <ProtectedRoute>
                <DailySummary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring/history"
            element={
              <ProtectedRoute>
                <HistoryLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

