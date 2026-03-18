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

/**
 * Farm Feed Log API
 */
export const feedAPI = {
  getCategories: async () => {
    const response = await apiRequest('/feed/categories');
    return response.data;
  },

  getItems: async () => {
    const response = await apiRequest('/feed/items');
    return response.data;
  },

  createFeedLog: async (date, items) => {
    return apiRequest('/feed/log', {
      method: 'POST',
      body: JSON.stringify({ date, items }),
    });
  },

  getFeedLogByDate: async (date) => {
    const response = await apiRequest(`/feed/log?date=${encodeURIComponent(date)}`);
    return response.data;
  },

  getWeightGroups: async () => {
    const response = await apiRequest('/feed/weight-groups');
    return response.data;
  },

  getFeedRequirements: async (groupId) => {
    const response = await apiRequest(`/feed/requirements/${groupId}`);
    return response.data;
  },

  getFeedRecommendation: async (cowId) => {
    const response = await apiRequest(`/feed/recommendation/${encodeURIComponent(cowId)}`);
    return response.data;
  },
};

/**
 * Parallel Milk Log API
 */
export const milkAPI = {
  createMilkLog: async (date, entries) => {
    return apiRequest('/milk/log', {
      method: 'POST',
      body: JSON.stringify({ date, entries }),
    });
  },

  getMilkLogByDate: async (date) => {
    const response = await apiRequest(`/milk/log?date=${encodeURIComponent(date)}`);
    return response.data;
  },

  getMilkLogByCow: async (cowId) => {
    const response = await apiRequest(`/milk/cow/${encodeURIComponent(cowId)}`);
    return response.data;
  },
};

/**
 * Medicine API
 */
export const medicineAPI = {
  getMedicines: async () => {
    const response = await apiRequest('/medicine');
    return response.data;
  },

  addMedicine: async (payload) => {
    return apiRequest('/medicine', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logCowMedicine: async (payload) => {
    return apiRequest('/medicine/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCowMedicineHistory: async (cowId) => {
    const response = await apiRequest(`/medicine/cow/${encodeURIComponent(cowId)}`);
    return response.data;
  },
};

/**
 * Activity API
 */
export const activityAPI = {
  getPendingActivities: async (cowId = null) => {
    const query = cowId ? `?cowId=${encodeURIComponent(cowId)}` : '';
    const response = await apiRequest(`/activity/pending${query}`);
    return response.data;
  },

  getCowActivities: async (cowId) => {
    const response = await apiRequest(`/activity/cow/${encodeURIComponent(cowId)}`);
    return response.data;
  },

  completeActivity: async (scheduleId, status = 'Completed', notes = null) => {
    return apiRequest('/activity/complete', {
      method: 'POST',
      body: JSON.stringify({
        schedule_id: scheduleId,
        status,
        notes
      }),
    });
  },

  generateActivities: async (cowId) => {
    return apiRequest('/activity/generate', {
      method: 'POST',
      body: JSON.stringify({ cow_id: cowId }),
    });
  },
};

