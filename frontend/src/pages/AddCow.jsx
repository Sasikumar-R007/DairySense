import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Link as LinkIcon, RefreshCw, BarChart3 } from 'lucide-react';
import { cowsAPI } from '../services/cowsAPI';
import './AddCow.css';

function AddCow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);
  const [availableCows, setAvailableCows] = useState([]);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createdCowId, setCreatedCowId] = useState(null);
  const pollingRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const [formData, setFormData] = useState({
    cow_id: '',
    cow_type: 'normal',
    breed: '',
    weight_kg: '',
    source_type: 'Purchased',
    parent_id: '',
    date_of_birth: '',
    purchase_date: '',
    last_vaccination_date: '',
    next_vaccination_date: '',
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
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const cows = await cowsAPI.getAllCows();
      setAvailableCows(cows);
    } catch (error) {
      console.error('Error loading cows:', error);
    }
  };

  const generateCowId = async (overrideData = {}) => {
    const generationData = {
      breed: overrideData.breed ?? formData.breed,
      purchaseDate: overrideData.purchase_date ?? formData.purchase_date,
      sourceType: overrideData.source_type ?? formData.source_type
    };

    if (!generationData.breed || !generationData.purchaseDate || !generationData.sourceType) {
      setFormData(prev => ({ ...prev, cow_id: '' }));
      return;
    }

    setGeneratingId(true);
    try {
      const cowId = await cowsAPI.generateCowId(generationData);
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
    const nextFormData = {
      ...formData,
      [name]: value
    };

    if (name === 'source_type' && value !== 'Delivered') {
      nextFormData.parent_id = '';
    }

    setFormData(nextFormData);

    if (name === 'breed' || name === 'purchase_date' || name === 'source_type') {
      generateCowId(nextFormData);
    }
  };

  useEffect(() => {
    if (formData.source_type !== 'Delivered' && formData.parent_id) {
      setFormData(prev => ({
        ...prev,
        parent_id: ''
      }));
    }
  }, [formData.source_type, formData.parent_id]);

  const handleParentChange = (e) => {
    const parentId = e.target.value;
    setFormData(prev => ({
      ...prev,
      parent_id: parentId,
      cow_type: parentId && prev.cow_type === 'normal' ? 'calf' : prev.cow_type
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.breed || !formData.purchase_date || !formData.source_type || !formData.weight_kg) {
      showMessage('error', 'Breed, Purchase Date, Source Type, and Weight are required');
      return;
    }

    if (formData.source_type === 'Delivered' && !formData.parent_id) {
      showMessage('error', 'Parent ID is required for delivered cows');
      return;
    }

    if (!formData.cow_id) {
      showMessage('error', 'Cow ID is not ready yet. Please check breed, purchase date, and source type.');
      return;
    }

    setLoading(true);
    try {
      const response = await cowsAPI.createCow({
        ...formData,
        name: formData.cow_id
      });
      const cowId = response.data.cow_id;
      setAvailableCows(prev => [response.data, ...prev]);
      
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
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/cows/rfid/pending`;
        console.log('[RFID Polling] Fetching:', apiUrl);
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        console.log('[RFID Polling] Response:', data);
        console.log('[RFID Polling] Pending scans count:', data.data?.length || 0);
        
        if (data.data && data.data.length > 0) {
          // Get the most recent pending scan
          const latestScan = data.data[0];
          console.log('[RFID Polling] Latest scan detected:', latestScan);
          
          setRfidLinkingState(prev => {
            // Only update if still in waiting or found state
            if (prev.step === 'waiting' || prev.step === 'found') {
              console.log('[RFID Polling] Updating state to found');
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
        } else {
          console.log('[RFID Polling] No pending scans found');
        }
      } catch (error) {
        console.error('[RFID Polling] Error:', error);
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
          <button onClick={() => navigate(-1)} className="back-button">
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {qrCodeData ? (
          <div className="qr-success-section">
            <CheckCircle size={48} className="success-icon" style={{ color: '#10b981' }} />
            <h3>Cow Added Successfully!</h3>
            <p>Cow ID: <strong>{qrCodeData.cowId}</strong></p>
            
            <div className="qr-code-display">
              <img src={qrCodeData.qrCode} alt="QR Code" />
            </div>
            
            {/* RFID Linking Step */}
            {rfidLinkingState.step !== 'none' && (
              <div className="rfid-linking-section" style={{ marginTop: '30px', padding: '20px', border: '2px solid #667eea', borderRadius: '8px', backgroundColor: '#f8f9ff' }}>
                <h4 style={{ marginTop: 0, color: '#667eea', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LinkIcon size={20} />
                  Link RFID Tag
                </h4>
                
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
                        <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: '#10b981' }} />
                        RFID Tag Detected: <strong>{rfidLinkingState.pendingRfid}</strong>
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
                      <CheckCircle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: '#10b981' }} />
                      RFID Tag Successfully Linked!
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
                    cow_type: 'normal',
                    breed: '',
                    weight_kg: '',
                    source_type: 'Purchased',
                    parent_id: '',
                    date_of_birth: '',
                    purchase_date: '',
                    last_vaccination_date: '',
                    next_vaccination_date: '',
                    notes: ''
                  });
                  loadInitialData();
                }} 
                className="add-another-button"
              >
                ➕ Add Another Cow
              </button>
              <button 
                onClick={() => navigate('/dashboard')} 
                className="dashboard-button"
              >
                <BarChart3 size={18} style={{ marginRight: '0.5rem' }} />
                Go to Dashboard
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
                    disabled
                    placeholder="Auto-generated from breed, purchase date, and source type"
                  />
                  <button
                    type="button"
                    onClick={() => generateCowId()}
                    disabled={generatingId || !formData.breed || !formData.purchase_date || !formData.source_type}
                    className="generate-button"
                  >
                    {generatingId ? 'Generating...' : (
                      <>
                        <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                        Regenerate
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="source_type">Source Type *</label>
                <select
                  id="source_type"
                  name="source_type"
                  value={formData.source_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Purchased">Purchased</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>

            <div className="form-row">
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
                  <option value="milking">Milking Stage</option>
                  <option value="pregnant">Pregnant</option>
                  <option value="dry">Dry</option>
                  <option value="calf">Calf</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="breed">Breed *</label>
                <input
                  id="breed"
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleInputChange}
                  placeholder="Enter breed"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="weight_kg">Weight (kg) *</label>
                <input
                  id="weight_kg"
                  type="number"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="Enter weight in kg"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="purchase_date">Purchase Date *</label>
                <input
                  id="purchase_date"
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {formData.source_type === 'Delivered' && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="parent_id">Parent ID *</label>
                  <select
                    id="parent_id"
                    name="parent_id"
                    value={formData.parent_id}
                    onChange={handleParentChange}
                    required
                  >
                    <option value="">Select Parent Cow</option>
                    {availableCows
                      .filter((cow) => cow.is_active !== false)
                      .map((cow) => (
                        <option key={cow.cow_id} value={cow.cow_id}>
                          {cow.cow_id} {cow.breed ? `- ${cow.breed}` : ''}
                        </option>
                      ))}
                  </select>
                </div>

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
              </div>
            )}

            {formData.source_type !== 'Delivered' && (
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
                  <label htmlFor="purchase_date_hint">Generated Format</label>
                  <input
                    id="purchase_date_hint"
                    type="text"
                    value={formData.cow_id || 'BREED-MMYY-TYPESEQ'}
                    disabled
                  />
                </div>
              </div>
            )}

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

