/**
 * In-memory OTP store for delivery verification.
 * Key: claimId  →  { otp: string, expiresAt: Date }
 *
 * For multi-node production, replace the Map with a Redis client
 * using the same public API (generateOtp, getOtp, verifyOtp).
 */

const store = new Map();
const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Generate a new 6-digit OTP for a claim (overwrites any existing one). */
function generateOtp(claimId) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  store.set(claimId, { otp, expiresAt: new Date(Date.now() + OTP_TTL_MS) });
  return otp;
}

/** Return the OTP for a claim, or null if absent/expired. */
function getOtp(claimId) {
  const entry = store.get(claimId);
  if (!entry) return null;
  if (new Date() > entry.expiresAt) {
    store.delete(claimId);
    return null;
  }
  return entry.otp;
}

/**
 * Verify an OTP.
 * Returns true on success (and deletes the entry so it can't be reused).
 * Returns false if the OTP is wrong or expired.
 */
function verifyOtp(claimId, otp) {
  const stored = getOtp(claimId);
  if (!stored) return false;
  if (stored !== String(otp).trim()) return false;
  store.delete(claimId);
  return true;
}

/** Remove an OTP (e.g. when a claim is cancelled). */
function clearOtp(claimId) {
  store.delete(claimId);
}

module.exports = { generateOtp, getOtp, verifyOtp, clearOtp };
