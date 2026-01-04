import { useState } from 'react';
import { dailyLaneLogAPI } from '../services/api';
import QRScannerModal from './QRScannerModal';
import './RecordMilkYield.css';

function RecordMilkYield() {
  const [cowId, setCowId] = useState('');
  const [milkSession, setMilkSession] = useState('morning');
  const [milkYield, setMilkYield] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedCow, setSelectedCow] = useState(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Handle QR scan success
  const handleQRScanSuccess = (cow) => {
    setSelectedCow(cow);
    setCowId(cow.cow_id);
    setShowQRScanner(false);
  };

  const handleRecordMilkYield = async () => {
    if (!cowId || !milkYield) {
      showMessage('error', 'Please enter Cow ID and Milk Yield');
      return;
    }

    setLoading(true);
    try {
      await dailyLaneLogAPI.recordMilkYield(cowId, milkSession, parseFloat(milkYield));
      showMessage('success', `${milkSession.charAt(0).toUpperCase() + milkSession.slice(1)} yield recorded successfully!`);
      
      // Clear yield input but keep cow ID
      setMilkYield('');
      
    } catch (error) {
      console.error('Error recording milk yield:', error);
      showMessage('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="record-milk">
      <div className="record-milk-card">
        <h2>Record Milk Yield</h2>
        <p className="section-description">
          Scan cow's ear tag and record morning or evening milk yield.
        </p>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-container">
          <div className="input-group">
            <label htmlFor="cowIdMilk">Cow ID (QR Scan)</label>
            <div className="scan-input-group">
              <button
                type="button"
                onClick={() => setShowQRScanner(true)}
                className="scan-qr-button"
              >
                📷 Scan QR Code
              </button>
              <input
                id="cowIdMilk"
                type="text"
                value={cowId}
                onChange={(e) => {
                  setCowId(e.target.value);
                  setSelectedCow(null);
                }}
                placeholder="Or enter Cow ID manually"
              />
            </div>
            {selectedCow && (
              <div className="selected-cow-info">
                ✓ {selectedCow.name || selectedCow.cow_id}
              </div>
            )}
          </div>

          <QRScannerModal
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            onScanSuccess={handleQRScanSuccess}
          />

          <div className="input-group">
            <label htmlFor="milkSession">Session</label>
            <select
              id="milkSession"
              value={milkSession}
              onChange={(e) => setMilkSession(e.target.value)}
            >
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="milkYield">Milk Yield (liters)</label>
            <input
              id="milkYield"
              type="number"
              step="0.1"
              value={milkYield}
              onChange={(e) => setMilkYield(e.target.value)}
              placeholder="Enter milk yield"
            />
          </div>

          <button 
            onClick={handleRecordMilkYield}
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Recording...' : `Record ${milkSession.charAt(0).toUpperCase() + milkSession.slice(1)} Yield`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecordMilkYield;

