/**
 * Unified in-memory live-location store for all parties.
 *
 * Keys are namespaced strings:
 *   volunteer:{taskId}
 *   donor:{claimId}
 *   receiver:{claimId}
 *
 * For multi-node production, replace with Redis (same API).
 */

const store = new Map();
const STALE_AFTER_MS = 120 * 1000; // 120 seconds

function setLocation(key, lat, lng) {
  store.set(key, { lat: parseFloat(lat), lng: parseFloat(lng), updatedAt: new Date() });
}

/**
 * Returns { lat, lng } or null if the entry is missing or stale (>120 s old).
 */
function getLocation(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - new Date(entry.updatedAt).getTime() > STALE_AFTER_MS) {
    store.delete(key);
    return null;
  }
  return { lat: entry.lat, lng: entry.lng };
}

function clearLocation(key) {
  store.delete(key);
}

module.exports = { setLocation, getLocation, clearLocation };
