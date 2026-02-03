import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, AlertCircle, CheckCircle, AlertTriangle, Download, Calendar } from 'lucide-react';
import { monitoringAPI } from '../services/monitoringAPI';
import jsPDF from 'jspdf';
import './MonitoringCowList.css';

function MonitoringCowList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cows, setCows] = useState([]);
  const [filteredCows, setFilteredCows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    fetchCowsList();
  }, [selectedDate]);

  useEffect(() => {
    filterCows();
  }, [cows, searchTerm, statusFilter]);

  const fetchCowsList = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await monitoringAPI.getCowsList(selectedDate);
      setCows(result);
    } catch (err) {
      console.error('Error fetching cows list:', err);
      setError('Failed to load cows list');
    } finally {
      setLoading(false);
    }
  };

  const filterCows = () => {
    let filtered = [...cows];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cow => 
        cow.cowId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(cow => cow.status === statusFilter);
    }

    setFilteredCows(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'NORMAL':
        return <CheckCircle size={20} className="status-icon normal" />;
      case 'SLIGHT_DROP':
        return <AlertCircle size={20} className="status-icon slight-drop" />;
      case 'ATTENTION':
        return <AlertTriangle size={20} className="status-icon attention" />;
      default:
        return <AlertCircle size={20} className="status-icon" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'NORMAL':
        return 'Normal';
      case 'SLIGHT_DROP':
        return 'Slight Drop';
      case 'ATTENTION':
        return 'Attention Needed';
      default:
        return status;
    }
  };

  const handleDownloadReport = () => {
    if (filteredCows.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Cow Performance Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Date
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    const dateStr = new Date(selectedDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Date: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Summary
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Cows: ${filteredCows.length}`, margin, yPos);
    yPos += 8;
    
    const normalCount = filteredCows.filter(c => c.status === 'NORMAL').length;
    const slightDropCount = filteredCows.filter(c => c.status === 'SLIGHT_DROP').length;
    const attentionCount = filteredCows.filter(c => c.status === 'ATTENTION').length;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Normal: ${normalCount} | Slight Drop: ${slightDropCount} | Attention: ${attentionCount}`, margin, yPos);
    yPos += 15;

    // Table header
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Cow ID', margin, yPos);
    doc.text('Milk (L)', margin + 50, yPos);
    doc.text('Feed (kg)', margin + 90, yPos);
    doc.text('Status', margin + 140, yPos);
    yPos += 8;

    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Table rows
    doc.setFont(undefined, 'normal');
    filteredCows.forEach((cow, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }

      doc.text(cow.cowId, margin, yPos);
      doc.text(cow.todayMilk.toFixed(1), margin + 50, yPos);
      doc.text(cow.todayFeed.toFixed(1), margin + 90, yPos);
      doc.text(getStatusLabel(cow.status), margin + 140, yPos);
      yPos += 8;

      if (index < filteredCows.length - 1) {
        doc.setLineWidth(0.2);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        yPos += 4;
      }
    });

    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('Generated by DairySense', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save PDF
    doc.save(`cow-performance-${selectedDate}.pdf`);
    setShowDownloadModal(false);
  };

  if (loading) {
    return (
      <div className="monitoring-cow-list">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <p>Loading cows...</p>
      </div>
      </div>
    );
  }

  return (
    <div className="monitoring-cow-list">
      <header className="cow-list-header">
        <button 
          className="back-button" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Cow Performance</h1>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="date-input-small"
        />
      </header>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input 
            type="text"
            placeholder="Search by Cow ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="status-filters">
          <button 
            className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'NORMAL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('NORMAL')}
          >
            Normal
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'SLIGHT_DROP' ? 'active' : ''}`}
            onClick={() => setStatusFilter('SLIGHT_DROP')}
          >
            Slight Drop
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'ATTENTION' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ATTENTION')}
          >
            Attention
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchCowsList}>Retry</button>
        </div>
      )}

      {/* Download Section */}
      <div className="performance-download-section">
        <button 
          className="download-performance-btn" 
          onClick={() => setShowDownloadModal(true)}
          disabled={filteredCows.length === 0}
        >
          <Download size={18} />
          <span>Download Performance Report</span>
        </button>
      </div>

      <div className="cows-grid">
        {filteredCows.length === 0 ? (
          <div className="empty-state">
            <p>No cows found</p>
          </div>
        ) : (
          filteredCows.map(cow => (
            <div 
              key={cow.cowId} 
              className="cow-card"
              onClick={() => navigate(`/monitoring/cows/${cow.cowId}`)}
            >
              <div className="cow-card-header">
                <h3>{cow.cowId}</h3>
                {getStatusIcon(cow.status)}
              </div>
              
              <div className="cow-stats">
                <div className="cow-stat">
                  <span className="stat-label">Today's Milk</span>
                  <span className="stat-value">{cow.todayMilk.toFixed(1)} L</span>
                </div>
                <div className="cow-stat">
                  <span className="stat-label">Today's Feed</span>
                  <span className="stat-value">{cow.todayFeed.toFixed(1)} kg</span>
                </div>
              </div>

              <div className="cow-status-badge">
                <span className={`status-badge ${cow.status.toLowerCase().replace('_', '-')}`}>
                  {getStatusLabel(cow.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Download Confirmation Modal */}
      {showDownloadModal && (
        <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="download-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Download Performance Report</h3>
            <div className="download-preview">
              <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Total Cows:</strong> {filteredCows.length}</p>
              <p><strong>Normal:</strong> {filteredCows.filter(c => c.status === 'NORMAL').length}</p>
              <p><strong>Slight Drop:</strong> {filteredCows.filter(c => c.status === 'SLIGHT_DROP').length}</p>
              <p><strong>Attention:</strong> {filteredCows.filter(c => c.status === 'ATTENTION').length}</p>
              <p className="modal-note">This will generate a PDF report with all cow performance data.</p>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDownloadModal(false)}>
                Cancel
              </button>
              <button className="confirm-download-btn" onClick={handleDownloadReport}>
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonitoringCowList;

