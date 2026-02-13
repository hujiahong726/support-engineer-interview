import crypto from "crypto";

const HMAC_KEY = process.env.HMAC_KEY || "default-hmac-key-change-in-production";

if (!process.env.HMAC_KEY) {
  console.warn(
    "⚠️  HMAC_KEY is not set in environment. Using default key for development only. Set HMAC_KEY in .env.local for production."
  );
}

/**
 * Extract the last 4 digits of SSN
 */
export function getSsnLast4(ssn: string): string {
  return ssn.slice(-4);
}

/**
 * Create HMAC-SHA256 hash of SSN for uniqueness checks
 * DO NOT store plaintext SSN - this hash allows duplicate detection without exposing SSN
 */
export function getSsnHash(ssn: string): string {
  return crypto.createHmac("sha256", HMAC_KEY).update(ssn).digest("hex");
}

/**
 * Validates SSN exists but doesn't expose it
 * Use this for checking if an SSN has already been registered
 */
export function validateSsnUniqueness(providedSsn: string, storedHash: string): boolean {
  const providedHash = getSsnHash(providedSsn);
  return providedHash === storedHash;
}
