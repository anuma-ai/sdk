/**
 * Test Utilities for Signature Mocking
 *
 * Provides mock signature functions for testing that bypass rate limiting,
 * and optional live signature functions that respect Privy's rate limits.
 *
 * By default, all tests use mock signatures which bypass rate limiting.
 * To enable live tests with real Privy signatures, set ENABLE_LIVE_SIGNATURE_TESTS=true.
 */

import type { SignMessageFn } from "../react/useEncryption";

/**
 * Create a deterministic mock signature based on a message.
 * This bypasses rate limiting and is suitable for all tests.
 *
 * @param message - The message to sign
 * @returns A deterministic hex signature string
 */
export function createMockSignature(message: string): string {
  // Create a deterministic signature based on message content
  // This ensures the same message always produces the same signature
  const hash = Buffer.from(message).toString("hex").padStart(130, "0");
  return `0x${hash}`;
}

/**
 * Mock signature function that bypasses rate limiting.
 * Use this for all tests by default.
 *
 * @param message - The message to sign
 * @returns A deterministic mock signature
 */
export const mockSignMessage: SignMessageFn = async (message: string) => {
  return createMockSignature(message);
};

/**
 * Check if live signature tests are enabled.
 * Set ENABLE_LIVE_SIGNATURE_TESTS=true to enable.
 */
export function isLiveSignatureTestsEnabled(): boolean {
  return process.env.ENABLE_LIVE_SIGNATURE_TESTS === "true";
}

/**
 * Rate limit tracker for live signature tests.
 * Tracks signature requests to respect Privy's 5 signatures per 60 seconds limit.
 */
class LiveSignatureRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests = 5;
  private readonly windowMs = 60000; // 60 seconds

  /**
   * Check if we can make a signature request without exceeding rate limit.
   * If we're at the limit, wait until the oldest request expires.
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    // If we're at the limit, wait until the oldest request expires
    if (this.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestTimestamp) + 100; // Add 100ms buffer

      if (waitTime > 0) {
        console.warn(
          `[Live Signature Test] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Clean up again after waiting
        const newNow = Date.now();
        this.timestamps = this.timestamps.filter(
          (ts) => newNow - ts < this.windowMs
        );
      }
    }

    // Record this request
    this.timestamps.push(Date.now());
  }
}

const liveSignatureRateLimiter = new LiveSignatureRateLimiter();

/**
 * Live signature function that respects Privy's rate limits.
 * Only use this when ENABLE_LIVE_SIGNATURE_TESTS=true is set.
 *
 * This requires a real Privy signMessage function to be provided.
 * For tests, you would typically get this from your test setup.
 *
 * @param realSignMessage - The actual Privy signMessage function
 * @returns A signature function that respects rate limits
 */
export function createLiveSignMessage(
  realSignMessage: SignMessageFn
): SignMessageFn {
  return async (message: string): Promise<string> => {
    await liveSignatureRateLimiter.waitIfNeeded();
    return await realSignMessage(message);
  };
}

/**
 * Get the appropriate signature function for tests.
 * Returns mock by default, or live function if enabled.
 *
 * @param realSignMessage - Optional real Privy signMessage function (only used if live tests enabled)
 * @returns Signature function to use in tests
 */
export function getTestSignMessage(
  realSignMessage?: SignMessageFn
): SignMessageFn {
  if (isLiveSignatureTestsEnabled() && realSignMessage) {
    console.warn(
      "[Test] Using LIVE signature tests - rate limits will be respected"
    );
    return createLiveSignMessage(realSignMessage);
  }

  // Default to mock (no rate limiting)
  return mockSignMessage;
}

