import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, FileText } from 'lucide-react';
import { cowsAPI } from '../services/cowsAPI';
import { getFeedSuggestion } from '../utils/feedSuggestions';
import './QRScannerModal.css';

function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scanning, setScanning] = useState(false);
  const [scannedCowId, setScannedCowId] = useState(null);
  const [cowDetails, setCowDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    return () => {
      // Cleanup: stop scanner when component unmounts
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {
          // Ignore errors on cleanup
        });
        scannerRef.current = null;
      }
    };
  }, []);

  const startQRScanning = async () => {
    try {
      setError('');
      
      // Create Html5Qrcode instance
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      // Start scanning
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // Scanning box size
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // QR code scanned successfully
          await handleQRScanned(decodedText);
          
          // Stop scanning after successful scan
          if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => {});
            setScanning(false);
          }
        },
        (errorMessage) => {
          // Error handling - don't show errors for ongoing scanning attempts
          // Only log if it's not a "NotFoundException" (which is normal during scanning)
          if (errorMessage && !errorMessage.includes("NotFoundException")) {
            // Silent failure - QR code scanning is trying multiple times
          }
        }
      );
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      setError('Unable to start camera. Please check permissions or try manual input.');
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
    if (isOpen && scanning) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        startQRScanning();
      }, 100);
    } else {
      stopQRScanning();
    }
    
    return () => {
      stopQRScanning();
    };
  }, [isOpen, scanning]);

  const handleQRScanned = async (scannedData) => {
    // QR code was scanned - extract cow_id from URL or use directly
    let cowId = scannedData;
    
    // If QR code contains URL (new format), extract cow_id
    if (scannedData.includes('/cow/')) {
      const match = scannedData.match(/\/cow\/([^\/\?]+)/);
      if (match) {
        cowId = match[1];
      }
    }
    
    // Process the cow ID
    await fetchCowDetails(cowId);
  };

  const handleManualInput = async (e) => {
    e.preventDefault();
    const cowId = e.target.cowId.value.trim();
    
    if (!cowId) {
      setError('Please enter a Cow ID');
      return;
    }
    
    await fetchCowDetails(cowId);
  };

  const fetchCowDetails = async (cowId) => {
    setLoading(true);
    setError('');
    
    try {
      const cow = await cowsAPI.getCowById(cowId);
      
      if (!cow) {
        setError('Cow not found. Please check the Cow ID.');
        setLoading(false);
        return;
      }
      
      setCowDetails(cow);
      setScannedCowId(cowId);
      setScanning(false);
      stopCamera();
      
      // Call success callback with cow details
      if (onScanSuccess) {
        onScanSuccess(cow);
      }
    } catch (err) {
      console.error('Error fetching cow details:', err);
      setError(err.message || 'Failed to fetch cow details');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setScanning(false);
    setCowDetails(null);
    setScannedCowId(null);
    setError('');
    stopCamera();
    onClose();
  };

  const handleShowFullDetails = () => {
    if (scannedCowId) {
      window.location.href = `/cow-details/${scannedCowId}`;
    }
  };

  if (!isOpen) return null;

  const feedSuggestion = cowDetails ? getFeedSuggestion(cowDetails.cow_type) : null;

  return (
    <div className="qr-modal-overlay" onClick={handleClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h2>Scan Cow QR Code</h2>
          <button onClick={handleClose} className="close-button">×</button>
        </div>

        <div className="qr-modal-body">
          {!cowDetails ? (
            <>
              <div className="scan-options">
                <button
                  onClick={() => setScanning(!scanning)}
                  className={`scan-button ${scanning ? 'active' : ''}`}
                >
                  {scanning ? '🛑 Stop Scanning' : '📷 Start Camera Scan'}
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
                    {loading ? 'Loading...' : 'Search'}
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
            </>
          ) : (
            <div className="cow-details-display">
              <div className="success-badge">
                <CheckCircle size={18} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'middle' }} />
                Cow Found
              </div>
              
              <div className="cow-info-grid">
                <div className="info-item">
                  <label>Cow ID:</label>
                  <span className="cow-id-value">{cowDetails.cow_id}</span>
                </div>
                
                <div className="info-item">
                  <label>Name:</label>
                  <span>{cowDetails.name || 'N/A'}</span>
                </div>
                
                <div className="info-item">
                  <label>Type:</label>
                  <span className={`cow-type-badge ${cowDetails.cow_type}`}>
                    {cowDetails.cow_type || 'normal'}
                  </span>
                </div>
                
                <div className="info-item">
                  <label>Breed:</label>
                  <span>{cowDetails.breed || 'N/A'}</span>
                </div>
              </div>

              {feedSuggestion && (
                <div className="feed-suggestion-box">
                  <strong>Suggested Feed Amount:</strong>
                  <span className="feed-amount">{feedSuggestion} kg</span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  onClick={handleShowFullDetails}
                  className="full-details-button"
                >
                  <FileText size={16} style={{ marginRight: '0.5rem' }} />
                  Show Full Details
                </button>
                <button
                  onClick={handleClose}
                  className="use-this-button"
                >
                  ✓ Use This Cow
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRScannerModal;

