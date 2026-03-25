import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Force Vercel redeployment trigger
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import MasterReport from './pages/MasterReport';
import MilkMasterLog from './pages/MilkMasterLog';
import FeedMasterLog from './pages/FeedMasterLog';
import FeedLog from './pages/FeedLog';
import MilkYieldLog from './pages/MilkYieldLog';
import FeedRecommendation from './pages/FeedRecommendation';
import MedicineLog from './pages/MedicineLog';
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
import FarmActivities from './pages/FarmActivities';
import SmartDashboard from './pages/SmartDashboard';
import WorkerManagement from './pages/WorkerManagement';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Layout-wrapped authenticated routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><Dashboard /></ProtectedRoute>} />
            <Route path="/feed-log" element={<FeedLog />} />
            <Route path="/milk-log" element={<MilkYieldLog />} />
            <Route path="/feed-recommendation" element={<FeedRecommendation />} />
            <Route path="/medicine-log" element={<MedicineLog />} />
            <Route path="/add-cow" element={<AddCow />} />
            <Route path="/cows" element={<CowsList />} />
            <Route path="/cow-details/:cowId" element={<CowDetails />} />
            
            {/* Monitoring Sub-routes */}
            <Route path="/monitoring" element={<MonitoringDashboard />} />
            <Route path="/monitoring/cows" element={<MonitoringCowList />} />
            <Route path="/monitoring/cows/:cowId" element={<MonitoringCowDetail />} />
            <Route path="/monitoring/summary" element={<DailySummary />} />
            <Route path="/monitoring/history" element={<HistoryLog />} />
            
            {/* User & Admin Routes */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/worker-management" element={<ProtectedRoute requireAdmin={true}><WorkerManagement /></ProtectedRoute>} />
            
            {/* Other Operations */}
            <Route path="/farm-activities" element={<FarmActivities />} />
            <Route path="/master-report" element={<MasterReport />} />
            <Route path="/milk-master-log" element={<MilkMasterLog />} />
            <Route path="/feed-master-log" element={<FeedMasterLog />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

