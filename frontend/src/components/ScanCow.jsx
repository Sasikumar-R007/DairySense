import { useEffect, useState } from 'react';
import { dailyLaneLogAPI } from '../services/api';
import { cowsAPI } from '../services/cowsAPI';
import QRScannerModal from './QRScannerModal';
import './ScanCow.css';

function ScanCow() {
  const [cowId, setCowId] = useState('');
  const [rfidUid, setRfidUid] = useState('');
  const [laneNo, setLaneNo] = useState('');
  const [feedKg, setFeedKg] = useState('');
  const [totalCowCount, setTotalCowCount] = useState(0);
  const [existingEntry, setExistingEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedCow, setSelectedCow] = useState(null);

  useEffect(() => {
    loadCowCount();
  }, []);

  const loadCowCount = async () => {
    try {
      const cows = await cowsAPI.getAllCows();
      setTotalCowCount(cows.length);
    } catch (error) {
      console.error('Error loading cow count:', error);
      setTotalCowCount(0);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Handle QR scan success
  const handleQRScanSuccess = (cow) => {
    setSelectedCow(cow);
    setCowId(cow.cow_id);
    setRfidUid(cow.rfid_uid || '');
    setShowQRScanner(false);
    
    // Check for existing entry if lane is selected
    if (laneNo) {
      checkExistingEntry(cow.cow_id);
    }
  };

  // Check existing entry
  const checkExistingEntry = async (id) => {
    try {
      const entry = await dailyLaneLogAPI.getTodayEntryForCowLane(parseInt(laneNo), id);
      if (entry) {
        setExistingEntry(entry);
        if (entry.feed_given_kg !== null && entry.feed_given_kg !== undefined) {
          setFeedKg(entry.feed_given_kg.toString());
        }
      } else {
        setExistingEntry(null);
        setFeedKg('');
      }
    } catch (error) {
      console.error('Error checking existing entry:', error);
    }
  };

  // Handle RFID input (primary method)
  const handleRfidInput = (e) => {
    const uid = e.target.value;
    setRfidUid(uid);
    // Don't clear cowId yet - wait for lookup
  };

  // Lookup cow by RFID UID
  const handleRfidLookup = async () => {
    if (!rfidUid.trim()) {
      showMessage('error', 'Please enter RFID UID');
      return;
    }

    setLoading(true);
    try {
      const cow = await cowsAPI.getCowByRfidUid(rfidUid);
      
      if (!cow) {
        showMessage('error', 'No cow found with this RFID UID');
        setLoading(false);
        return;
      }
      
      setSelectedCow(cow);
      setCowId(cow.cow_id);
      setRfidUid(cow.rfid_uid || '');
      
      // Check for existing entry if lane is selected
      if (laneNo) {
        await checkExistingEntry(cow.cow_id);
      }

      showMessage('success', `Cow found: ${cow.name || cow.cow_id}`);
    } catch (error) {
      console.error('Error looking up cow by RFID:', error);
      showMessage('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual cow ID input (fallback)
  const handleCowIdChange = (e) => {
    const id = e.target.value;
    setCowId(id);
    setRfidUid(''); // Clear RFID when using manual ID
    setExistingEntry(null);
    setSelectedCow(null);
  };

  const handleCowIdLookup = async () => {
    if (!cowId.trim()) {
      showMessage('error', 'Please enter Cow ID');
      return;
    }

    setLoading(true);
    try {
      const cow = await cowsAPI.getCowById(cowId.trim());
      setSelectedCow(cow);
      setCowId(cow.cow_id);
      setRfidUid(cow.rfid_uid || '');

      if (laneNo) {
        await checkExistingEntry(cow.cow_id);
      }

      showMessage('success', `Cow found: ${cow.name || cow.cow_id}`);
    } catch (error) {
      console.error('Error looking up cow by ID:', error);
      setSelectedCow(null);
      setExistingEntry(null);
      showMessage('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle lane number change
  const handleLaneChange = async (e) => {
    const lane = e.target.value;
    setLaneNo(lane);
    setExistingEntry(null);
    
    // Check for existing entry if cow ID is entered
    if (cowId && lane) {
      await checkExistingEntry(cowId);
    }
  };

  // Handle feed record save
  const handleSaveRecord = async () => {
    if (!selectedCow) {
      showMessage('error', 'Please load a valid cow before saving');
      return;
    }

    if (!cowId || !laneNo || !feedKg) {
      showMessage('error', 'Please fill all required fields: Cow ID, Lane No, and Feed (kg)');
      return;
    }

    setLoading(true);
    try {
      await dailyLaneLogAPI.recordFeed(
        parseInt(laneNo),
        cowId,
        undefined,
        parseFloat(feedKg)
      );
      showMessage('success', 'Feed recorded successfully!');
      
      // Refresh existing entry
      const entry = await dailyLaneLogAPI.getTodayEntryForCowLane(parseInt(laneNo), cowId);
      if (entry) {
        setExistingEntry(entry);
      }
      
    } catch (error) {
      console.error('Error recording feed:', error);
      showMessage('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scan-cow">
      <div className="scan-cow-card">
        <h2>Scan Cow & Record Feed</h2>
        <p className="section-description">
          Scan cow, select lane, enter feed, and save the record.
        </p>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-container">
          <div className="input-group">
            <label htmlFor="rfidUid">RFID UID (Optional)</label>
            <div className="scan-input-group">
              <input
                id="rfidUid"
                type="text"
                value={rfidUid}
                onChange={handleRfidInput}
                placeholder="Scan RFID tag using hardware reader"
                style={{ flex: 1 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRfidLookup();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleRfidLookup}
                className="scan-qr-button"
                disabled={!rfidUid.trim() || loading}
              >
                {loading ? '...' : '🔍 Lookup'}
              </button>
            </div>
            <small style={{ display: 'block', marginTop: '4px', fontSize: '0.85em', color: '#666' }}>
              Optional during testing. Loading a cow by ID or QR will fill RFID automatically if linked.
            </small>
            {selectedCow && (
              <div className="selected-cow-info">
                ✓ {selectedCow.name || selectedCow.cow_id} ({selectedCow.cow_type})
              </div>
            )}
          </div>

          <div className="input-group" style={{ marginTop: '16px' }}>
            <label htmlFor="cowId">Cow ID (Alternative: QR Scan)</label>
            <div className="scan-input-group">
              <button
                type="button"
                onClick={() => setShowQRScanner(true)}
                className="scan-qr-button"
              >
                📷 Scan QR Code
              </button>
              <input
                id="cowId"
                type="text"
                value={cowId}
                onChange={handleCowIdChange}
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
            <small style={{ display: 'block', marginTop: '4px', fontSize: '0.85em', color: '#666' }}>
              Secondary method: Use QR code scanning if RFID is not available
            </small>
          </div>

          <QRScannerModal
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            onScanSuccess={handleQRScanSuccess}
          />

          {selectedCow && (
            <div className="info-box">
              <strong>Cow:</strong> {selectedCow.name || selectedCow.cow_id} ({selectedCow.cow_id})
            </div>
          )}

          {existingEntry && (
            <div className="info-box">
              <strong>Existing Entry:</strong> Feed: {existingEntry.feed_given_kg ?? 'Not set'} kg
            </div>
          )}

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="laneNo">Lane Number</label>
              <select
                id="laneNo"
                value={laneNo}
                onChange={handleLaneChange}
              >
                <option value="">Select Lane</option>
                {Array.from({ length: totalCowCount }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>Lane {num}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="feedKg">Feed Given (kg)</label>
              <input
                id="feedKg"
                type="number"
                step="0.1"
                value={feedKg}
                onChange={(e) => setFeedKg(e.target.value)}
                placeholder="Enter feed weight"
              />
            </div>
          </div>

          <button 
            onClick={handleSaveRecord}
            disabled={loading || !selectedCow}
            className="submit-button"
          >
            {loading ? 'Saving...' : 'Save Feed'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScanCow;

