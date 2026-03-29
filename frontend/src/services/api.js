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
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    const error = await response.json().catch(() => ({ error: 'Network error. Backend might be unreachable or waking up.' }));
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

  createItem: async (payload) => {
    return apiRequest('/feed/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateItem: async (id, payload) => {
    return apiRequest(`/feed/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteItem: async (id) => {
    return apiRequest(`/feed/items/${id}`, {
      method: 'DELETE',
    });
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

  getAllFeedLogs: async (startDate = '', endDate = '') => {
    let query = '';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      query = `?${params.toString()}`;
    }
    const response = await apiRequest(`/feed/all-logs${query}`);
    return response.data;
  },

  updateFeedLog: async (id, quantityKg) => {
    return apiRequest(`/feed/log/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity_kg: quantityKg }),
    });
  },

  deleteFeedLog: async (id) => {
    return apiRequest(`/feed/log/${id}`, {
      method: 'DELETE',
    });
  },

  getCowsByWeight: async (min, max) => {
    let query = '';
    if (min !== undefined) query += `min=${min}`;
    if (max !== undefined) {
      if (query) query += '&';
      query += `max=${max}`;
    }
    const response = await apiRequest(`/feed/cows-by-weight${query ? '?' + query : ''}`);
    return response.data;
  },

  logBulkFeed: async (payload) => {
    return apiRequest('/feed/bulk-log', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logCowFeed: async (payload) => {
    return apiRequest('/feed/cow-log', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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

  getAllMilkLogs: async (startDate = '', endDate = '') => {
    let query = '';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      query = `?${params.toString()}`;
    }
    const response = await apiRequest(`/milk/all-logs${query}`);
    return response.data;
  },

  deleteMilkLog: async (id) => {
    return apiRequest(`/milk/log/${id}`, {
      method: 'DELETE',
    });
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

  updateMedicine: async (id, payload) => {
    return apiRequest(`/medicine/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteMedicine: async (id) => {
    return apiRequest(`/medicine/${id}`, {
      method: 'DELETE',
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

/**
 * Dashboard API
 */
export const dashboardAPI = {
  getDashboardData: async (dateStr) => {
    return apiRequest(`/dashboard?date=${dateStr}`);
  }
};

/**
 * Report API
 */
export const reportAPI = {
  downloadDailyReport: async (dateStr) => {
    const token = localStorage.getItem('auth_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/report/daily/pdf?date=${dateStr}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to download report');
    }
    
    return response.blob();
  },
  
  getMasterReport: async (from, to) => {
    const response = await apiRequest(`/report/master?from=${from}&to=${to}`);
    return response.data;
  }
};

/**
 * User API
 */
export const userAPI = {
  getAllUsers: async () => {
    return apiRequest('/users');
  },
  
  createUser: async (userData) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  updateUser: async (id, userData) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  deleteUser: async (id) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
  
  updateProfile: async (data) => {
    return apiRequest('/users/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  updatePassword: async (password) => {
    return apiRequest('/users/password/me', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }
};

/**
 * Settings API
 */
export const settingsAPI = {
  getSettings: () => apiRequest('/settings'),
  
  updateSettings: (data) => apiRequest('/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  backupDatabase: () => apiRequest('/settings/backup', {
    method: 'POST'
  })
};

