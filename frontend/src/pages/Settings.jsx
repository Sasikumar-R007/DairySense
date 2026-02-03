import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Globe, 
  Lock, 
  BookOpen, 
  Radio, 
  Tag,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [language, setLanguage] = useState('english');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    // TODO: Implement language change functionality
    console.log('Language changed to:', lang);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    try {
      // TODO: Implement password change API call
      // const result = await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      // Simulate success for now
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      setPasswordError(error.message || 'Failed to change password');
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings-content">
        {/* Language Settings */}
        <div className="settings-section">
          <div className="settings-section-header" onClick={() => toggleSection('language')}>
            <div className="section-title">
              <Globe size={24} />
              <h2>Language Settings</h2>
            </div>
            <span className="section-toggle">{expandedSection === 'language' ? '−' : '+'}</span>
          </div>
          {expandedSection === 'language' && (
            <div className="settings-section-content">
              <p className="section-description">Select your preferred language for the application</p>
              <div className="language-options">
                <button 
                  className={`language-option ${language === 'english' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('english')}
                >
                  <span>English</span>
                  {language === 'english' && <Check size={20} />}
                </button>
                <button 
                  className={`language-option ${language === 'tamil' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('tamil')}
                >
                  <span>தமிழ் (Tamil)</span>
                  {language === 'tamil' && <Check size={20} />}
                </button>
                <button 
                  className={`language-option ${language === 'hindi' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('hindi')}
                >
                  <span>हिंदी (Hindi)</span>
                  {language === 'hindi' && <Check size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="settings-section">
          <div className="settings-section-header" onClick={() => toggleSection('password')}>
            <div className="section-title">
              <Lock size={24} />
              <h2>Change Password</h2>
            </div>
            <span className="section-toggle">{expandedSection === 'password' ? '−' : '+'}</span>
          </div>
          {expandedSection === 'password' && (
            <div className="settings-section-content">
              <form onSubmit={handlePasswordChange} className="password-form">
                {passwordError && <div className="error-message">{passwordError}</div>}
                {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
                
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      required
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      required
                      placeholder="Enter new password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      required
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="submit-button">
                  Change Password
                </button>
              </form>
            </div>
          )}
        </div>

        {/* User Guide */}
        <div className="settings-section">
          <div className="settings-section-header" onClick={() => toggleSection('guide')}>
            <div className="section-title">
              <BookOpen size={24} />
              <h2>User Guide</h2>
            </div>
            <span className="section-toggle">{expandedSection === 'guide' ? '−' : '+'}</span>
          </div>
          {expandedSection === 'guide' && (
            <div className="settings-section-content">
              <div className="guide-content">
                <h3>Welcome to DairySense</h3>
                <p>DairySense is a smart dairy monitoring system that helps you track and manage your dairy operations efficiently.</p>
                
                <h4>Key Features:</h4>
                <ul>
                  <li><strong>Monitoring Dashboard:</strong> View real-time statistics about your dairy operations</li>
                  <li><strong>Record Management:</strong> Scan cows, record feed, and track milk yields</li>
                  <li><strong>Cow Performance:</strong> Analyze individual cow performance and history</li>
                  <li><strong>Daily Reports:</strong> Get comprehensive daily summaries of your operations</li>
                  <li><strong>History Log:</strong> Access historical data and trends</li>
                </ul>

                <h4>Getting Started:</h4>
                <ol>
                  <li>Use the Monitoring Dashboard to get an overview of your dairy operations</li>
                  <li>Navigate to Record Management to scan cows and record data</li>
                  <li>View individual cow performance for detailed insights</li>
                  <li>Check daily reports and history for comprehensive analysis</li>
                </ol>

                <h4>Tips:</h4>
                <ul>
                  <li>Scan cows regularly to maintain accurate records</li>
                  <li>Record milk yields twice daily (morning and evening) for best results</li>
                  <li>Monitor low yield cows for health issues</li>
                  <li>Use the date filter to view historical data</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* About RFID Reader */}
        <div className="settings-section">
          <div className="settings-section-header" onClick={() => toggleSection('reader')}>
            <div className="section-title">
              <Radio size={24} />
              <h2>About RFID Reader</h2>
            </div>
            <span className="section-toggle">{expandedSection === 'reader' ? '−' : '+'}</span>
          </div>
          {expandedSection === 'reader' && (
            <div className="settings-section-content">
              <div className="info-content">
                <h3>RFID Reader Hardware</h3>
                <p>The DairySense RFID Reader is a custom-built hardware device designed for efficient cow tracking in dairy operations.</p>
                
                <h4>Features:</h4>
                <ul>
                  <li><strong>Lane-based Scanning:</strong> Automatically detects cows as they pass through feeding lanes</li>
                  <li><strong>Real-time Data:</strong> Instantly transmits cow ID and timestamp to the system</li>
                  <li><strong>Weather Resistant:</strong> Built to withstand farm environment conditions</li>
                  <li><strong>Low Power Consumption:</strong> Energy-efficient design for continuous operation</li>
                  <li><strong>High Accuracy:</strong> Reliable tag reading with minimal errors</li>
                </ul>

                <h4>Installation:</h4>
                <p>The RFID reader should be installed at the entrance of each feeding lane, positioned to capture tags as cows enter.</p>

                <h4>Maintenance:</h4>
                <ul>
                  <li>Keep the reader clean and free from debris</li>
                  <li>Check connections regularly</li>
                  <li>Ensure adequate power supply</li>
                  <li>Test reading accuracy periodically</li>
                </ul>

                <h4>Technical Specifications:</h4>
                <ul>
                  <li>Frequency: 125 kHz / 134.2 kHz</li>
                  <li>Reading Range: Up to 15 cm</li>
                  <li>Power Supply: 12V DC</li>
                  <li>Communication: USB / Serial</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* About Tag */}
        <div className="settings-section">
          <div className="settings-section-header" onClick={() => toggleSection('tag')}>
            <div className="section-title">
              <Tag size={24} />
              <h2>About RFID Tag</h2>
            </div>
            <span className="section-toggle">{expandedSection === 'tag' ? '−' : '+'}</span>
          </div>
          {expandedSection === 'tag' && (
            <div className="settings-section-content">
              <div className="info-content">
                <h3>RFID Ear Tags</h3>
                <p>Each cow is equipped with a unique RFID ear tag that serves as its identification in the DairySense system.</p>
                
                <h4>Tag Features:</h4>
                <ul>
                  <li><strong>Unique ID:</strong> Each tag has a unique identification number</li>
                  <li><strong>Durable:</strong> Designed to last for the lifetime of the cow</li>
                  <li><strong>Weather Resistant:</strong> Waterproof and weatherproof design</li>
                  <li><strong>Easy Installation:</strong> Simple ear tag application process</li>
                  <li><strong>Non-invasive:</strong> Comfortable for the animal</li>
                </ul>

                <h4>Tag Installation:</h4>
                <ol>
                  <li>Prepare the ear tag applicator</li>
                  <li>Position the tag on the cow's ear</li>
                  <li>Apply the tag using the applicator tool</li>
                  <li>Register the tag ID in the system with the cow's details</li>
                  <li>Verify the tag is readable with the RFID reader</li>
                </ol>

                <h4>Tag Maintenance:</h4>
                <ul>
                  <li>Check tags regularly for damage or loss</li>
                  <li>Replace damaged tags immediately</li>
                  <li>Keep tags clean for optimal reading</li>
                  <li>Record tag replacements in the system</li>
                </ul>

                <h4>Best Practices:</h4>
                <ul>
                  <li>Install tags when cows are young for better acceptance</li>
                  <li>Ensure tags are securely attached to prevent loss</li>
                  <li>Register tag IDs immediately after installation</li>
                  <li>Keep a backup record of tag-cow associations</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;

