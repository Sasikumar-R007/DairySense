import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cowsAPI } from '../services/cowsAPI';
import './CowsList.css';

function CowsList() {
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadCows();
  }, []);

  const loadCows = async () => {
    try {
      setLoading(true);
      const data = await cowsAPI.getAllCows();
      setCows(data);
    } catch (error) {
      console.error('Error loading cows:', error);
      showMessage('error', 'Failed to load cows');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Filter cows based on search term and type
  const filteredCows = cows.filter(cow => {
    const matchesSearch = 
      cow.cow_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cow.name && cow.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cow.breed && cow.breed.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || cow.cow_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleViewDetails = (cowId) => {
    navigate(`/cow-details/${cowId}`);
  };

  return (
    <div className="cows-list">
      <div className="cows-list-card">
        <div className="page-header">
          <h2>All Cows</h2>
          <button 
            onClick={() => navigate('/add-cow')} 
            className="add-cow-button"
          >
            ➕ Add New Cow
          </button>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by ID, name, or breed..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-buttons">
            <button
              className={`filter-button ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`filter-button ${filterType === 'normal' ? 'active' : ''}`}
              onClick={() => setFilterType('normal')}
            >
              Normal
            </button>
            <button
              className={`filter-button ${filterType === 'pregnant' ? 'active' : ''}`}
              onClick={() => setFilterType('pregnant')}
            >
              Pregnant
            </button>
            <button
              className={`filter-button ${filterType === 'dry' ? 'active' : ''}`}
              onClick={() => setFilterType('dry')}
            >
              Dry
            </button>
          </div>
        </div>

        {/* Cows Table */}
        {loading ? (
          <div className="loading-state">Loading cows...</div>
        ) : filteredCows.length === 0 ? (
          <div className="empty-state">
            {cows.length === 0 
              ? 'No cows found. Add your first cow!'
              : 'No cows match your search criteria.'
            }
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="cows-table">
              <thead>
                <tr>
                  <th>Cow ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Breed</th>
                  <th>Calves</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCows.map((cow) => (
                  <tr key={cow.cow_id}>
                    <td className="cow-id-cell">{cow.cow_id}</td>
                    <td>{cow.name || '-'}</td>
                    <td>
                      <span className={`cow-type-badge ${cow.cow_type || 'normal'}`}>
                        {cow.cow_type || 'normal'}
                      </span>
                    </td>
                    <td>{cow.breed || '-'}</td>
                    <td>{cow.number_of_calves || 0}</td>
                    <td>
                      <span className={`status-badge ${cow.status || 'active'}`}>
                        {cow.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(cow.cow_id)}
                        className="view-button"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredCows.length > 0 && (
          <div className="table-footer">
            <span>Total: {filteredCows.length} cow(s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CowsList;

