/**
 * Monitoring API Service
 * 
 * Client for monitoring module API endpoints
 */

import { apiRequest } from './api.js';

const BASE_URL = '/monitoring'; // /api is already included in API_BASE_URL

export const monitoringAPI = {
  /**
   * Get dashboard data
   * @param {string} date - Optional date in YYYY-MM-DD format
   */
  getDashboard: async (date = null) => {
    const params = date ? `?date=${date}` : '';
    return apiRequest(`${BASE_URL}/dashboard${params}`, {
      method: 'GET',
    });
  },

  /**
   * Get cows list with metrics
   * @param {string} date - Optional date in YYYY-MM-DD format
   */
  getCowsList: async (date = null) => {
    const params = date ? `?date=${date}` : '';
    return apiRequest(`${BASE_URL}/cows${params}`, {
      method: 'GET',
    });
  },

  /**
   * Get cow detail with trend data
   * @param {string} cowId - Cow ID
   * @param {string} date - Optional date in YYYY-MM-DD format
   */
  getCowDetail: async (cowId, date = null) => {
    const params = date ? `?date=${date}` : '';
    return apiRequest(`${BASE_URL}/cows/${cowId}${params}`, {
      method: 'GET',
    });
  },

  /**
   * Get daily summary
   * @param {string} date - Date in YYYY-MM-DD format
   */
  getDailySummary: async (date) => {
    return apiRequest(`${BASE_URL}/summary?date=${date}`, {
      method: 'GET',
    });
  },

  /**
   * Get history log
   * @param {string} fromDate - Start date in YYYY-MM-DD format
   * @param {string} toDate - End date in YYYY-MM-DD format
   */
  getHistoryLog: async (fromDate, toDate) => {
    return apiRequest(`${BASE_URL}/history?from=${fromDate}&to=${toDate}`, {
      method: 'GET',
    });
  }
};

