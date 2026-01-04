/**
 * API Service
 * Handles all HTTP requests to the backend
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
 * Exported for use by other API modules
 */
export async function apiRequest(endpoint, options = {}) {
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
    // If unauthorized or forbidden, clear invalid token and user data
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Dispatch a storage event to notify AuthContext (will be handled by the component)
    }
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Authentication API
 */
export const authAPI = {
  login: async (email, password) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      // Store token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (email, password) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    // Only return user if token exists (valid session)
    if (token && user) {
      return JSON.parse(user);
    }
    // Clear stale user data if no token
    if (!token && user) {
      localStorage.removeItem('user');
    }
    return null;
  },
};

/**
 * Daily Lane Log API
 */
export const dailyLaneLogAPI = {
  // Record feed (Flow A)
  recordFeed: async (laneNo, cowId, cowType, feedKg) => {
    const body = { laneNo, cowId, feedKg };
    if (cowType) {
      body.cowType = cowType;
    }
    return apiRequest('/daily-lane-log/feed', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  
  // Record milk yield (Flow B)
  recordMilkYield: async (cowId, session, yieldL) => {
    return apiRequest('/daily-lane-log/milk-yield', {
      method: 'POST',
      body: JSON.stringify({ cowId, session, yieldL }),
    });
  },
  
  // Get today's logs
  getTodayLogs: async () => {
    const response = await apiRequest('/daily-lane-log/today');
    return response.data;
  },
  
  // Get entry for specific cow and lane today
  getTodayEntryForCowLane: async (laneNo, cowId) => {
    const response = await apiRequest(
      `/daily-lane-log/entry?laneNo=${laneNo}&cowId=${encodeURIComponent(cowId)}`
    );
    return response.data;
  },
};

