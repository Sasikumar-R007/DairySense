/**
 * Cows API Service
 * Handles all HTTP requests for cow management
 */

import API_BASE_URL from '../config/api.js';

/**
 * Get authentication token from localStorage
 */
function getToken() {
  return localStorage.getItem('auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export const cowsAPI = {
  // Generate new cow ID
  generateCowId: async () => {
    const response = await apiRequest('/cows/generate-id');
    return response.cow_id;
  },
  
  // Get all cows
  getAllCows: async () => {
    const response = await apiRequest('/cows');
    return response.data;
  },
  
  // Get cow by ID
  getCowById: async (cowId) => {
    const response = await apiRequest(`/cows/${cowId}`);
    return response.data;
  },
  
  // Create new cow
  createCow: async (cowData) => {
    const response = await apiRequest('/cows', {
      method: 'POST',
      body: JSON.stringify(cowData),
    });
    return response;
  },
  
  // Update cow
  updateCow: async (cowId, cowData) => {
    const response = await apiRequest(`/cows/${cowId}`, {
      method: 'PUT',
      body: JSON.stringify(cowData),
    });
    return response.data;
  },
  
  // Generate QR code
  generateQRCode: async (cowId) => {
    const response = await apiRequest(`/cows/${cowId}/qr`);
    return response.qr_code;
  },
  
  // Get feed history
  getFeedHistory: async (cowId, days = 30) => {
    const response = await apiRequest(`/cows/${cowId}/feed-history?days=${days}`);
    return response.data;
  },
  
  // Get milk history
  getMilkHistory: async (cowId, days = 30) => {
    const response = await apiRequest(`/cows/${cowId}/milk-history?days=${days}`);
    return response.data;
  },
  
  // Get medications
  getMedications: async (cowId) => {
    const response = await apiRequest(`/cows/${cowId}/medications`);
    return response.data;
  },
  
  // Add medication
  addMedication: async (cowId, medicationData) => {
    const response = await apiRequest(`/cows/${cowId}/medications`, {
      method: 'POST',
      body: JSON.stringify(medicationData),
    });
    return response.data;
  },

  // Get cow by RFID UID (for hardware integration)
  getCowByRfidUid: async (rfidUid) => {
    const response = await apiRequest(`/cows/rfid/${rfidUid}`);
    return response.data;
  },

  // Get public read-only cow profile (no authentication required)
  getCowPublicProfile: async (cowId) => {
    const response = await fetch(`${API_BASE_URL}/cows/public/${cowId}/profile`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to fetch cow profile');
    }
    const data = await response.json();
    return data.data;
  },
};

