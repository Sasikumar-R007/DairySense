import { useState } from 'react';
import { dailyLaneLogAPI } from '../services/api';
import { cowsAPI } from '../services/cowsAPI';
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
    if (cow.cow_type === 'calf') {
      setSelectedCow(cow);
      setCowId(cow.cow_id);
      setShowQRScanner(false);
      showMessage('error', `Milk yield is not recorded for calves (${cow.cow_id})`);
      return;
    }

    setSelectedCow(cow);
    setCowId(cow.cow_id);
    setShowQRScanner(false);
    showMessage('success', `Cow found: ${cow.name || cow.cow_id}`);
  };

  const handleCowIdLookup = async () => {
    if (!cowId.trim()) {
      showMessage('error', 'Please enter Cow ID');
      return;
    }

    setLoading(true);
    try {
      const cow = await cowsAPI.getCowById(cowId.trim());
      if (cow.cow_type === 'calf') {
        setSelectedCow(cow);
        setCowId(cow.cow_id);
        showMessage('error', `Milk yield is not recorded for calves (${cow.cow_id})`);
        return;
      }

      setSelectedCow(cow);
      setCowId(cow.cow_id);
      showMessage('success', `Cow found: ${cow.name || cow.cow_id}`);
    } catch (error) {
      console.error('Error looking up cow by ID:', error);
      setSelectedCow(null);
      showMessage('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordMilkYield = async () => {
    if (!cowId || !milkYield) {
      showMessage('error', 'Please enter Cow ID and Milk Yield');
      return;
    }

    if (selectedCow?.cow_type === 'calf') {
      showMessage('error', `Milk yield is not recorded for calves (${selectedCow.cow_id})`);
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCowIdLookup();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleCowIdLookup}
                className="scan-qr-button"
                disabled={!cowId.trim() || loading}
              >
                {loading ? '...' : 'Load Cow'}
              </button>
            </div>
            {selectedCow && (
              <div className="selected-cow-info matched">
                ✓ {selectedCow.name || selectedCow.cow_id}
              </div>
            )}
          </div>

          <QRScannerModal
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            onScanSuccess={handleQRScanSuccess}
          />

          <div className="milk-row">
            <div className="input-group session-group">
              <label>Session</label>
              <button
                type="button"
                className={`session-switch ${milkSession === 'evening' ? 'evening' : 'morning'}`}
                onClick={() => setMilkSession(prev => prev === 'morning' ? 'evening' : 'morning')}
                aria-label={`Milk session: ${milkSession}`}
              >
                <span className="session-switch-label morning">Morning</span>
                <span className="session-switch-label evening">Evening</span>
                <span className="session-switch-thumb" aria-hidden="true"></span>
              </button>
            </div>

            <div className="input-group yield-group">
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
          </div>

          <button 
            onClick={handleRecordMilkYield}
            disabled={loading || selectedCow?.cow_type === 'calf'}
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

