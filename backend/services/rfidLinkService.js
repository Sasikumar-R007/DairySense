/**
 * RFID Link Service
 * Handles temporary storage of pending RFID scans for linking to cows
 */

// In-memory store for pending RFID scans
// Format: { rfidUid: { timestamp, expiresAt } }
const pendingRfidScans = new Map();

// Cleanup interval - remove expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [rfidUid, data] of pendingRfidScans.entries()) {
    if (data.expiresAt < now) {
      pendingRfidScans.delete(rfidUid);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

/**
 * Store a pending RFID scan
 * @param {string} rfidUid - The RFID UID to store
 * @param {number} ttlMinutes - Time to live in minutes (default: 10)
 * @returns {object} - The stored scan data
 */
export function storePendingRfidScan(rfidUid, ttlMinutes = 10) {
  const now = Date.now();
  const expiresAt = now + (ttlMinutes * 60 * 1000);
  
  pendingRfidScans.set(rfidUid, {
    timestamp: now,
    expiresAt: expiresAt
  });
  
  return {
    rfid_uid: rfidUid,
    timestamp: now,
    expiresAt: expiresAt
  };
}

/**
 * Get a pending RFID scan
 * @param {string} rfidUid - The RFID UID to retrieve
 * @returns {object|null} - The scan data or null if not found/expired
 */
export function getPendingRfidScan(rfidUid) {
  const data = pendingRfidScans.get(rfidUid);
  
  if (!data) {
    return null;
  }
  
  // Check if expired
  if (data.expiresAt < Date.now()) {
    pendingRfidScans.delete(rfidUid);
    return null;
  }
  
  return {
    rfid_uid: rfidUid,
    timestamp: data.timestamp,
    expiresAt: data.expiresAt
  };
}

/**
 * Get all pending RFID scans
 * @returns {array} - Array of pending scan objects
 */
export function getAllPendingRfidScans() {
  const now = Date.now();
  const pending = [];
  
  for (const [rfidUid, data] of pendingRfidScans.entries()) {
    if (data.expiresAt >= now) {
      pending.push({
        rfid_uid: rfidUid,
        timestamp: data.timestamp,
        expiresAt: data.expiresAt
      });
    } else {
      // Clean up expired entry
      pendingRfidScans.delete(rfidUid);
    }
  }
  
  // Sort by timestamp (newest first)
  return pending.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Remove a pending RFID scan (after successful linking)
 * @param {string} rfidUid - The RFID UID to remove
 */
export function removePendingRfidScan(rfidUid) {
  pendingRfidScans.delete(rfidUid);
}

/**
 * Clear all pending scans (for cleanup/testing)
 */
export function clearAllPendingScans() {
  pendingRfidScans.clear();
}

