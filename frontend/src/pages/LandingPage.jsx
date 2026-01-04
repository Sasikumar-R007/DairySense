import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';
import './LandingPage.css';

function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in (only if we have a valid token)
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (currentUser && token) {
      navigate('/monitoring', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect to monitoring dashboard on success
        navigate('/monitoring', { replace: true });
      } else {
        setError(result.error || 'Failed to login');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Header with Login Button */}
      <header className="landing-header-nav">
        <div className="landing-logo">
          <h1>DairySense</h1>
        </div>
        <button 
          className="login-header-btn"
          onClick={() => setShowLoginModal(true)}
        >
          <LogIn size={18} />
          <span>Login</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="landing-hero">
        <div className="landing-hero-content">
          <div className="hero-text">
            <h2 className="hero-title">Smart Dairy Monitoring System</h2>
            <p className="hero-subtitle">
              Track your dairy operations with advanced RFID technology. 
              Monitor milk yield, feed distribution, and cow performance in real-time.
            </p>
            <button 
              className="hero-cta-btn"
              onClick={() => setShowLoginModal(true)}
            >
              Get Started
            </button>
          </div>
          <div className="hero-images">
            <div className="floating-image image-1">
              <img 
                src="/assests/image 3 removebg.png" 
                alt="Dairy Management"
                onError={(e) => {
                  e.target.src = '/assests/image 2 removebg.png';
                }}
              />
            </div>
            <div className="floating-image image-2">
              <img 
                src="/assests/image 2 removebg.png" 
                alt="Smart Dairy"
                onError={(e) => {
                  e.target.src = '/assests/image 3 removebg.png';
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="landing-features">
        <div className="feature-card">
          <div className="feature-icon">🐄</div>
          <h3>Lane-based Tracking</h3>
          <p>Track cows through feeding lanes with RFID technology</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🥛</div>
          <h3>Milk Yield Monitoring</h3>
          <p>Monitor and record daily milk production</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌾</div>
          <h3>Feed Management</h3>
          <p>Optimize feed distribution for better yields</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Real-time Dashboard</h3>
          <p>Get instant insights into your dairy operations</p>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setShowLoginModal(false)}
            >
              ×
            </button>
            <h2>Login to DairySense</h2>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>

              <button 
                type="submit" 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
