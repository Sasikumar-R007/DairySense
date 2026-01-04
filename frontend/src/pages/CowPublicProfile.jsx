import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { cowsAPI } from '../services/cowsAPI';
import './CowPublicProfile.css';

function CowPublicProfile() {
  const { cowId: paramCowId } = useParams();
  const [cowId, setCowId] = useState(paramCowId || '');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const qrCodeRegionId = "public-qr-reader";

  useEffect(() => {
    if (paramCowId) {
      fetchProfile(paramCowId);
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [paramCowId]);

  const fetchProfile = async (id) => {
    setLoading(true);
    setError('');
    try {
      const data = await cowsAPI.getCowPublicProfile(id);
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load cow profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const startQRScanning = async () => {
    try {
      setError('');
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          await handleQRScanned(decodedText);
          if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => {});
            setScanning(false);
          }
        },
        (errorMessage) => {
          // Silent failure during scanning
        }
      );
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      setError('Unable to start camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopQRScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (scanning) {
      setTimeout(() => {
        startQRScanning();
      }, 100);
    } else {
      stopQRScanning();
    }
    return () => {
      stopQRScanning();
    };
  }, [scanning]);

  const handleQRScanned = async (scannedData) => {
    // Extract cow_id from URL or use directly
    let cowId = scannedData;
    
    // If QR code contains URL (new format), extract cow_id
    if (scannedData.includes('/cow/')) {
      const match = scannedData.match(/\/cow\/([^\/\?]+)/);
      if (match) {
        cowId = match[1];
      }
    }
    
    await fetchProfile(cowId);
  };

  const handleManualInput = async (e) => {
    e.preventDefault();
    const id = e.target.cowId.value.trim();
    if (!id) {
      setError('Please enter a Cow ID');
      return;
    }
    await fetchProfile(id);
  };

  if (loading && !profile) {
    return (
      <div className="cow-public-profile">
        <div className="public-profile-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cow-public-profile">
      <div className="public-profile-container">
        <div className="public-header">
          <h1>🐄 Cow Profile Viewer</h1>
          <p className="subtitle">Read-only access - Scan QR code to view cow information</p>
        </div>

        {!profile ? (
          <div className="scan-section">
            <div className="scan-options">
              <button
                onClick={() => setScanning(!scanning)}
                className={`scan-button ${scanning ? 'active' : ''}`}
              >
                {scanning ? '🛑 Stop Scanning' : '📷 Scan QR Code'}
              </button>
              
              <div className="or-divider">OR</div>
              
              <form onSubmit={handleManualInput} className="manual-input-form">
                <input
                  type="text"
                  name="cowId"
                  placeholder="Enter Cow ID manually"
                  className="manual-input"
                  disabled={loading}
                />
                <button type="submit" disabled={loading} className="submit-manual-button">
                  {loading ? 'Loading...' : 'View Profile'}
                </button>
              </form>
            </div>

            {scanning && (
              <div className="camera-preview">
                <div id={qrCodeRegionId} className="qr-scanner-container"></div>
                <div className="scan-instructions">
                  <p>Position QR code within the frame</p>
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">{error}</div>
            )}
          </div>
        ) : (
          <div className="profile-display">
            <div className="profile-header">
              <h2>{profile.name || profile.cow_id}</h2>
              <span className={`cow-type-badge ${profile.cow_type}`}>
                {profile.cow_type || 'normal'}
              </span>
            </div>

            <div className="profile-info-grid">
              <div className="info-item">
                <label>Cow ID:</label>
                <span>{profile.cow_id}</span>
              </div>
              
              <div className="info-item">
                <label>Breed:</label>
                <span>{profile.breed || 'N/A'}</span>
              </div>
              
              <div className="info-item">
                <label>Date of Birth:</label>
                <span>{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'}</span>
              </div>
              
              <div className="info-item">
                <label>Number of Calves:</label>
                <span>{profile.number_of_calves || 0}</span>
              </div>
              
              {profile.last_vaccination_date && (
                <div className="info-item">
                  <label>Last Vaccination:</label>
                  <span>{new Date(profile.last_vaccination_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {profile.next_vaccination_date && (
                <div className="info-item">
                  <label>Next Vaccination:</label>
                  <span>{new Date(profile.next_vaccination_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="summary-section">
              <h3>Recent Activity Summary</h3>
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Feed (Last 7 Days)</div>
                  <div className="summary-value">
                    {profile.recent_feed_summary.average_daily_feed_kg} kg/day
                  </div>
                  <div className="summary-meta">
                    {profile.recent_feed_summary.days_tracked} days tracked
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-label">Milk Yield (Last 7 Days)</div>
                  <div className="summary-value">
                    {profile.recent_milk_summary.average_daily_yield_l} L/day
                  </div>
                  <div className="summary-meta">
                    {profile.recent_milk_summary.days_tracked} days tracked
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button
                onClick={() => {
                  setProfile(null);
                  setCowId('');
                  setError('');
                }}
                className="scan-another-button"
              >
                🔄 Scan Another Cow
              </button>
            </div>

            <div className="read-only-notice">
              <p>ℹ️ This is a read-only view. Data entry requires authenticated access.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CowPublicProfile;

