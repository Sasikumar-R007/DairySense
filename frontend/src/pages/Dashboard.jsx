import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Plus, Users, ArrowLeft, Wheat, Milk, Scale, Syringe, ClipboardList, Monitor } from 'lucide-react';
import ScanCow from '../components/ScanCow';
import RecordMilkYield from '../components/RecordMilkYield';
import LiveTable from '../components/LiveTable';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('scan'); // 'scan', 'milk', 'table'
  const [showAdvancedTracking, setShowAdvancedTracking] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <button 
            className="back-to-monitoring-btn"
            onClick={() => navigate(-1)}
            aria-label="Back to Monitoring Dashboard"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1>Record Management</h1>
          <div className="header-actions">
            <span className="user-email">{currentUser?.email}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="advanced-tracking-toggle-container" style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '1rem' }}>
        <button 
          className="modern-download-btn"
          onClick={() => setShowAdvancedTracking(!showAdvancedTracking)}
          style={{ width: 'auto', padding: '0.75rem 2rem', backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          {showAdvancedTracking ? 'Hide' : 'Show'} Advanced Real-time Tracking (Optional)
        </button>
      </div>

      {showAdvancedTracking && (
        <nav className="dashboard-nav">
          <button 
            className={`nav-button ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
          >
            Scan Cow & Feed
          </button>
          <button 
            className={`nav-button ${activeTab === 'milk' ? 'active' : ''}`}
            onClick={() => setActiveTab('milk')}
          >
            Record Milk Yield
          </button>
          <button 
            className={`nav-button ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            Live Table View
          </button>
        </nav>
      )}

      {/* Action Buttons Section */}
      <div className="dashboard-action-buttons">
        <button 
          onClick={() => navigate('/cows')}
          className="action-button-modern cows-list-button-modern"
        >
          <Users size={24} />
          <div className="button-text">
            <span className="button-title">All Cows</span>
            <span className="button-subtitle">View and manage all cows</span>
          </div>
        </button>
        <button 
          onClick={() => navigate('/add-cow')}
          className="action-button-modern add-cow-button-modern"
        >
          <Plus size={24} />
          <div className="button-text">
            <span className="button-title">Add New Cow</span>
            <span className="button-subtitle">Register a new cow</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/feed-log')}
          className="action-button-modern cows-list-button-modern"
        >
          <Wheat size={24} />
          <div className="button-text">
            <span className="button-title">Farm Feed Log</span>
            <span className="button-subtitle">Record farm-level feed items</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/milk-log')}
          className="action-button-modern add-cow-button-modern"
        >
          <Milk size={24} />
          <div className="button-text">
            <span className="button-title">Milk Yield Log</span>
            <span className="button-subtitle">Record morning and evening milk</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/feed-recommendation')}
          className="action-button-modern cows-list-button-modern"
        >
          <Scale size={24} />
          <div className="button-text">
            <span className="button-title">Feed Recommendation</span>
            <span className="button-subtitle">View advisory weight-based feed</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/medicine-log')}
          className="action-button-modern add-cow-button-modern"
        >
          <Syringe size={24} />
          <div className="button-text">
            <span className="button-title">Medicine Log</span>
            <span className="button-subtitle">Record medicines and supplements</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/farm-activities')}
          className="action-button-modern cows-list-button-modern"
        >
          <ClipboardList size={24} />
          <div className="button-text">
            <span className="button-title">Farm Activities</span>
            <span className="button-subtitle">Manage routine activities</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/monitoring')}
          className="action-button-modern add-cow-button-modern"
        >
          <Monitor size={24} />
          <div className="button-text">
            <span className="button-title">Monitoring</span>
            <span className="button-subtitle">Unified Insights Dashboard</span>
          </div>
        </button>
      </div>

      {showAdvancedTracking && (
        <main className="dashboard-content">
          {activeTab === 'scan' && <ScanCow />}
          {activeTab === 'milk' && <RecordMilkYield />}
          {activeTab === 'table' && <LiveTable />}
        </main>
      )}
    </div>
  );
}

export default Dashboard;
