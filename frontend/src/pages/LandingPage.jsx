import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogIn, 
  Activity, 
  Milk, 
  Wheat, 
  BarChart3, 
  Radio, 
  TrendingUp, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight,
  X
} from 'lucide-react';
import './LandingPage.css';

function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
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
      {/* Header Navigation */}
      <header className="landing-header-nav">
        <div>
          <div className="landing-logo">
            <div className="logo-icon">
              <Activity size={28} />
            </div>
            <h1>DairySense</h1>
          </div>
          <button 
            className="login-header-btn"
            onClick={() => setShowLoginModal(true)}
          >
            <LogIn size={18} />
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-background">
          <div className="hero-pattern"></div>
        </div>
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={16} />
              <span>Smart Dairy Management</span>
            </div>
            <h1 className="hero-title">
              Transform Your Dairy Farm with
              <span className="highlight"> Intelligent Monitoring</span>
            </h1>
            <p className="hero-description">
              Experience the future of dairy farming with RFID-powered tracking, 
              real-time analytics, and automated insights. Maximize productivity, 
              optimize feed distribution, and monitor milk yield with precision.
            </p>
            <div className="hero-actions">
              <button 
                className="hero-cta-primary"
                onClick={() => setShowLoginModal(true)}
              >
                Get Started
                <ArrowRight size={18} />
              </button>
              <button 
                className="hero-cta-secondary"
                onClick={() => {
                  document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">100%</div>
                <div className="stat-label">Automated</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Monitoring</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">Real-time</div>
                <div className="stat-label">Analytics</div>
              </div>
            </div>
          </div>
          <div className="hero-image-section">
            <div className="hero-image-wrapper">
              <img 
                src="/assests/image 4.jpeg" 
                alt="Dairy Management System"
                className="hero-main-image"
              />
              <div className="floating-card card-1">
                <BarChart3 size={24} />
                <span>Real-time Analytics</span>
              </div>
              <div className="floating-card card-2">
                <Radio size={24} />
                <span>RFID Tracking</span>
              </div>
              <div className="floating-card card-3">
                <TrendingUp size={24} />
                <span>Performance Insights</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features for Modern Dairy Farms</h2>
            <p className="section-subtitle">
              Everything you need to manage and optimize your dairy operations
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Radio size={32} className="feature-icon" />
              </div>
              <h3>RFID Lane Tracking</h3>
              <p>Track individual cows through feeding lanes with advanced RFID technology. Monitor feed consumption and movement patterns in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Milk size={32} className="feature-icon" />
              </div>
              <h3>Milk Yield Monitoring</h3>
              <p>Record and analyze daily milk production with session-based tracking. Get insights into productivity trends and individual cow performance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Wheat size={32} className="feature-icon" />
              </div>
              <h3>Feed Management</h3>
              <p>Optimize feed distribution with precise tracking. Monitor consumption patterns and ensure optimal nutrition for maximum yield.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <BarChart3 size={32} className="feature-icon" />
              </div>
              <h3>Performance Analytics</h3>
              <p>Comprehensive dashboards with visual charts and reports. Track trends, identify patterns, and make data-driven decisions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Shield size={32} className="feature-icon" />
              </div>
              <h3>Health Monitoring</h3>
              <p>Early detection of health issues through automated alerts. Monitor cow status and receive notifications for attention-required cases.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Zap size={32} className="feature-icon" />
              </div>
              <h3>Real-time Updates</h3>
              <p>Instant notifications and live data updates. Stay informed about your farm's operations anytime, anywhere.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="landing-benefits">
        <div className="benefits-container">
          <div className="benefits-content">
            <div className="section-header">
              <h2 className="section-title">Why Choose DairySense?</h2>
              <p className="section-subtitle">
                Join modern dairy farms revolutionizing their operations
              </p>
            </div>
            <div className="benefits-list">
              <div className="benefit-item">
                <CheckCircle size={24} className="benefit-check" />
                <div>
                  <h4>Increase Productivity</h4>
                  <p>Optimize operations and boost milk yield with data-driven insights</p>
                </div>
              </div>
              <div className="benefit-item">
                <CheckCircle size={24} className="benefit-check" />
                <div>
                  <h4>Reduce Costs</h4>
                  <p>Minimize waste and optimize feed distribution for better ROI</p>
                </div>
              </div>
              <div className="benefit-item">
                <CheckCircle size={24} className="benefit-check" />
                <div>
                  <h4>Improve Animal Welfare</h4>
                  <p>Early health detection ensures better care for your livestock</p>
                </div>
              </div>
              <div className="benefit-item">
                <CheckCircle size={24} className="benefit-check" />
                <div>
                  <h4>Save Time</h4>
                  <p>Automate tracking and reporting to focus on what matters</p>
                </div>
              </div>
            </div>
          </div>
          <div className="benefits-image">
            <img 
              src="/assests/image 1.avif" 
              alt="Dairy Farm Benefits"
              className="benefit-main-image"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Ready to Transform Your Dairy Farm?</h2>
            <p>Start monitoring your operations with precision and intelligence</p>
            <button 
              className="cta-button"
              onClick={() => setShowLoginModal(true)}
            >
              Get Started Today
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setShowLoginModal(false)}
            >
              <X size={20} />
            </button>
            <div className="modal-header">
              <div className="modal-logo">
                <Activity size={32} />
              </div>
              <h2>Welcome Back</h2>
              <p>Login to access your dairy management dashboard</p>
            </div>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
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
                {loading ? (
                  <div className="loading-dots-inline">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                ) : (
                  <>
                    <LogIn size={18} />
                    Login
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
