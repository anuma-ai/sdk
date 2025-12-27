/**
 * Rate Limiting Utilities
 *
 * Provides rate limiting for signature requests and key derivation operations.
 */

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Default rate limit configurations
 */
const DEFAULT_RATE_LIMITS = {
  signatureRequest: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  keyDerivation: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
} as const;

/**
 * Rate limit entry tracking request timestamps
 */
interface RateLimitEntry {
  timestamps: number[];
  windowStart: number;
}

/**
 * In-memory rate limit store (per address)
 */
const rateLimitStore = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Clean up old rate limit entries (older than the window)
 */
function cleanupRateLimit(
  entry: RateLimitEntry,
  windowMs: number,
  now: number
): void {
  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < windowMs
  );
  
  // Update window start if needed
  if (entry.timestamps.length === 0) {
    entry.windowStart = now;
  }
}

/**
 * Check if a rate limit is exceeded
 * @param key - Unique key for rate limiting (e.g., address + operation type)
 * @param config - Rate limit configuration
 * @returns True if rate limit is exceeded, false otherwise
 */
export function isRateLimited(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS.signatureRequest
): boolean {
  const now = Date.now();
  const [address, operation] = key.split(":");
  
  // Get or create rate limit entry
  let addressLimits = rateLimitStore.get(address);
  if (!addressLimits) {
    addressLimits = new Map();
    rateLimitStore.set(address, addressLimits);
  }
  
  let entry = addressLimits.get(operation);
  if (!entry) {
    entry = { timestamps: [], windowStart: now };
    addressLimits.set(operation, entry);
  }
  
  // Clean up old timestamps
  cleanupRateLimit(entry, config.windowMs, now);
  
  // Check if limit is exceeded
  if (entry.timestamps.length >= config.maxRequests) {
    return true;
  }
  
  // Record this request
  entry.timestamps.push(now);
  
  return false;
}

/**
 * Record a rate-limited operation
 * @param key - Unique key for rate limiting
 * @param config - Rate limit configuration
 * @throws Error if rate limit is exceeded
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS.signatureRequest
): void {
  if (isRateLimited(key, config)) {
    throw new Error(
      `Rate limit exceeded: Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds`
    );
  }
}

/**
 * Create a rate limit key from address and operation
 */
export function createRateLimitKey(
  address: string,
  operation: "signature" | "keyDerivation"
): string {
  return `${address}:${operation}`;
}

/**
 * Check rate limit for signature requests
 */
export function checkSignatureRateLimit(address: string): void {
  const key = createRateLimitKey(address, "signature");
  checkRateLimit(key, DEFAULT_RATE_LIMITS.signatureRequest);
}

/**
 * Check rate limit for key derivation operations
 */
export function checkKeyDerivationRateLimit(address: string): void {
  const key = createRateLimitKey(address, "keyDerivation");
  checkRateLimit(key, DEFAULT_RATE_LIMITS.keyDerivation);
}

/**
 * Clear rate limit data for an address (useful for testing)
 */
export function clearRateLimit(address: string): void {
  rateLimitStore.delete(address);
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

