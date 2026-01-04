import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cowsAPI } from '../services/cowsAPI';
import './AddCow.css';

function AddCow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createdCowId, setCreatedCowId] = useState(null);
  const pollingRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const [formData, setFormData] = useState({
    cow_id: '',
    name: '',
    cow_type: 'normal',
    breed: '',
    date_of_birth: '',
    purchase_date: '',
    last_vaccination_date: '',
    next_vaccination_date: '',
    number_of_calves: 0,
    notes: ''
  });
  
  const [rfidLinkingState, setRfidLinkingState] = useState({
    step: 'none', // 'none', 'waiting', 'found', 'linked', 'manual'
    pendingRfid: null,
    manualRfidInput: '',
    linking: false
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Generate cow ID on mount
  useEffect(() => {
    generateCowId();
  }, []);

  const generateCowId = async () => {
    setGeneratingId(true);
    try {
      const cowId = await cowsAPI.generateCowId();
      setFormData(prev => ({ ...prev, cow_id: cowId }));
    } catch (error) {
      console.error('Error generating cow ID:', error);
      showMessage('error', 'Failed to generate cow ID');
    } finally {
      setGeneratingId(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'number_of_calves' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cow_id || !formData.name) {
      showMessage('error', 'Cow ID and Name are required');
      return;
    }

    setLoading(true);
    try {
      const response = await cowsAPI.createCow(formData);
      const cowId = response.data.cow_id;
      
      // Store created cow ID for RFID linking
      setCreatedCowId(cowId);
      
      // Generate QR code data URL for display
      setQrCodeData({
        cowId: cowId,
        qrCode: response.qr_code
      });
      
      // Start RFID linking step
      setRfidLinkingState({
        step: 'waiting',
        pendingRfid: null,
        manualRfidInput: '',
        linking: false
      });
      
      // Start polling for pending RFID scans
      startRfidPolling();
      
      showMessage('success', 'Cow added successfully! QR code generated. Now link RFID tag.');
    } catch (error) {
      console.error('Error creating cow:', error);
      showMessage('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Poll for pending RFID scans
  const startRfidPolling = () => {
    // Clear any existing polling
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const poll = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cows/rfid/pending`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          // Get the most recent pending scan
          const latestScan = data.data[0];
          
          setRfidLinkingState(prev => {
            // Only update if still in waiting or found state
            if (prev.step === 'waiting' || prev.step === 'found') {
              // Stop polling
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              
              showMessage('success', `RFID tag detected: ${latestScan.rfid_uid}`);
              
              return {
                ...prev,
                step: 'found',
                pendingRfid: latestScan.rfid_uid
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error polling for RFID:', error);
      }
    };
    
    // Start polling every 2 seconds
    pollingRef.current = setInterval(poll, 2000);
    
    // Stop polling after 10 minutes and switch to manual
    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setRfidLinkingState(prev => {
        if (prev.step === 'waiting') {
          return { ...prev, step: 'manual' };
        }
        return prev;
      });
    }, 10 * 60 * 1000);
    
    // Initial poll
    poll();
  };
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  // Link RFID to cow
  const handleLinkRfid = async (rfidUid) => {
    if (!createdCowId || !rfidUid) {
      showMessage('error', 'Missing cow ID or RFID UID');
      return;
    }
    
    setRfidLinkingState(prev => ({ ...prev, linking: true }));
    
    try {
      await cowsAPI.updateCow(createdCowId, { rfid_uid: rfidUid });
      
      // Remove from pending scans
      try {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cows/rfid/pending/${rfidUid}`, {
          method: 'DELETE'
        });
      } catch (err) {
        // Ignore cleanup errors
      }
      
      setRfidLinkingState(prev => ({
        ...prev,
        step: 'linked',
        linking: false
      }));
      
      showMessage('success', `RFID tag ${rfidUid} successfully linked to cow!`);
    } catch (error) {
      console.error('Error linking RFID:', error);
      showMessage('error', `Error: ${error.message}`);
      setRfidLinkingState(prev => ({ ...prev, linking: false }));
    }
  };
  
  // Handle manual RFID entry
  const handleManualRfidLink = async () => {
    const rfidUid = rfidLinkingState.manualRfidInput.trim();
    
    if (!rfidUid) {
      showMessage('error', 'Please enter RFID UID');
      return;
    }
    
    await handleLinkRfid(rfidUid);
  };
  
  // Skip RFID linking
  const handleSkipRfid = () => {
    // Stop polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setRfidLinkingState({
      step: 'none',
      pendingRfid: null,
      manualRfidInput: '',
      linking: false
    });
  };

  const handlePrintQR = () => {
    if (qrCodeData) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${qrCodeData.cowId}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              h2 { margin-bottom: 20px; }
              img { max-width: 400px; height: auto; }
              p { margin-top: 20px; font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>Cow ID: ${qrCodeData.cowId}</h2>
            <img src="${qrCodeData.qrCode}" alt="QR Code" />
            <p>Scan this QR code to view cow details</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="add-cow">
      <div className="add-cow-card">
        <div className="page-header">
          <h2>Add New Cow</h2>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {qrCodeData ? (
          <div className="qr-success-section">
            <div className="success-icon">✅</div>
            <h3>Cow Added Successfully!</h3>
            <p>Cow ID: <strong>{qrCodeData.cowId}</strong></p>
            
            <div className="qr-code-display">
              <img src={qrCodeData.qrCode} alt="QR Code" />
            </div>
            
            {/* RFID Linking Step */}
            {rfidLinkingState.step !== 'none' && (
              <div className="rfid-linking-section" style={{ marginTop: '30px', padding: '20px', border: '2px solid #667eea', borderRadius: '8px', backgroundColor: '#f8f9ff' }}>
                <h4 style={{ marginTop: 0, color: '#667eea' }}>🔗 Link RFID Tag</h4>
                
                {rfidLinkingState.step === 'waiting' && (
                  <div className="waiting-rfid">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                      <div className="spinner" style={{ 
                        width: '20px', 
                        height: '20px', 
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #667eea',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>Waiting for RFID scan...</span>
                    </div>
                    <p style={{ color: '#666', marginBottom: '15px' }}>
                      Scan the RFID tag using your hardware reader. The system will automatically detect it.
                    </p>
                    <button 
                      onClick={() => setRfidLinkingState(prev => ({ ...prev, step: 'manual' }))}
                      style={{ 
                        padding: '8px 16px', 
                        background: '#6c757d', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Enter Manually Instead
                    </button>
                    <button 
                      onClick={handleSkipRfid}
                      style={{ 
                        padding: '8px 16px', 
                        background: 'transparent', 
                        color: '#666', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginLeft: '10px'
                      }}
                    >
                      Skip RFID Linking
                    </button>
                  </div>
                )}
                
                {rfidLinkingState.step === 'found' && rfidLinkingState.pendingRfid && (
                  <div className="found-rfid">
                    <div style={{ marginBottom: '15px' }}>
                      <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#28a745' }}>
                        ✅ RFID Tag Detected: <strong>{rfidLinkingState.pendingRfid}</strong>
                      </span>
                    </div>
                    <button 
                      onClick={() => handleLinkRfid(rfidLinkingState.pendingRfid)}
                      disabled={rfidLinkingState.linking}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '1em',
                        fontWeight: 'bold'
                      }}
                    >
                      {rfidLinkingState.linking ? 'Linking...' : 'Link RFID Tag'}
                    </button>
                    <button 
                      onClick={() => setRfidLinkingState(prev => ({ ...prev, step: 'manual' }))}
                      style={{ 
                        padding: '10px 20px', 
                        background: 'transparent', 
                        color: '#666', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginLeft: '10px'
                      }}
                    >
                      Use Different RFID
                    </button>
                  </div>
                )}
                
                {rfidLinkingState.step === 'manual' && (
                  <div className="manual-rfid">
                    <p style={{ marginBottom: '15px', color: '#666' }}>
                      Enter the RFID UID manually (from hardware display):
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input
                        type="text"
                        value={rfidLinkingState.manualRfidInput}
                        onChange={(e) => setRfidLinkingState(prev => ({ ...prev, manualRfidInput: e.target.value }))}
                        placeholder="Enter RFID UID"
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '2px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '1em'
                        }}
                      />
                      <button 
                        onClick={handleManualRfidLink}
                        disabled={rfidLinkingState.linking || !rfidLinkingState.manualRfidInput.trim()}
                        style={{ 
                          padding: '10px 20px', 
                          background: '#667eea', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '1em',
                          fontWeight: 'bold'
                        }}
                      >
                        {rfidLinkingState.linking ? 'Linking...' : 'Link'}
                      </button>
                    </div>
                    <button 
                      onClick={handleSkipRfid}
                      style={{ 
                        padding: '8px 16px', 
                        background: 'transparent', 
                        color: '#666', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Skip RFID Linking
                    </button>
                  </div>
                )}
                
                {rfidLinkingState.step === 'linked' && (
                  <div className="linked-rfid" style={{ padding: '15px', background: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                    <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#155724' }}>
                      ✅ RFID Tag Successfully Linked!
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <div className="qr-actions" style={{ marginTop: '20px' }}>
              <button onClick={handlePrintQR} className="print-button">
                🖨️ Print QR Code
              </button>
              <button 
                onClick={() => {
                  setQrCodeData(null);
                  setCreatedCowId(null);
                  setRfidLinkingState({
                    step: 'none',
                    pendingRfid: null,
                    manualRfidInput: '',
                    linking: false
                  });
                  setFormData({
                    cow_id: '',
                    name: '',
                    cow_type: 'normal',
                    breed: '',
                    date_of_birth: '',
                    purchase_date: '',
                    last_vaccination_date: '',
                    next_vaccination_date: '',
                    number_of_calves: 0,
                    notes: ''
                  });
                  generateCowId();
                }} 
                className="add-another-button"
              >
                ➕ Add Another Cow
              </button>
              <button 
                onClick={() => navigate('/dashboard')} 
                className="dashboard-button"
              >
                📊 Go to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="cow-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cow_id">Cow ID *</label>
                <div className="input-with-button">
                  <input
                    id="cow_id"
                    type="text"
                    name="cow_id"
                    value={formData.cow_id}
                    onChange={handleInputChange}
                    required
                    disabled={generatingId}
                    placeholder="Will be auto-generated"
                  />
                  <button
                    type="button"
                    onClick={generateCowId}
                    disabled={generatingId}
                    className="generate-button"
                  >
                    {generatingId ? 'Generating...' : '🔄 Regenerate'}
                  </button>
                </div>
              </div>

            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Cow Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter cow name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cow_type">Cow Type *</label>
                <select
                  id="cow_type"
                  name="cow_type"
                  value={formData.cow_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="normal">Normal</option>
                  <option value="pregnant">Pregnant</option>
                  <option value="dry">Dry</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="breed">Breed</label>
                <input
                  id="breed"
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleInputChange}
                  placeholder="Enter breed"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date_of_birth">Date of Birth</label>
                <input
                  id="date_of_birth"
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="purchase_date">Purchase Date</label>
                <input
                  id="purchase_date"
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="last_vaccination_date">Last Vaccination Date</label>
                <input
                  id="last_vaccination_date"
                  type="date"
                  name="last_vaccination_date"
                  value={formData.last_vaccination_date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="next_vaccination_date">Next Vaccination Date</label>
                <input
                  id="next_vaccination_date"
                  type="date"
                  name="next_vaccination_date"
                  value={formData.next_vaccination_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="number_of_calves">Number of Calves</label>
                <input
                  id="number_of_calves"
                  type="number"
                  name="number_of_calves"
                  value={formData.number_of_calves}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="4"
                placeholder="Any additional notes about this cow..."
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => navigate('/dashboard')} className="cancel-button">
                Cancel
              </button>
              <button type="submit" disabled={loading || generatingId} className="submit-button">
                {loading ? 'Creating...' : 'Create Cow & Generate QR Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddCow;

