/**
 * Live Test Utilities
 *
 * Provides utilities for running tests with real Privy signatures.
 * These tests respect rate limits and should only be run when explicitly enabled.
 */

/**
 * Check if live signature tests are enabled.
 * Set ENABLE_LIVE_SIGNATURE_TESTS=true to enable.
 */
export function isLiveSignatureTestsEnabled(): boolean {
  return process.env.ENABLE_LIVE_SIGNATURE_TESTS === "true";
}

/**
 * Skip test if live signature tests are not enabled.
 * Use this to mark tests that require real Privy signatures.
 *
 * @example
 * ```typescript
 * describe("Live Signature Tests", () => {
 *   skipIfLiveTestsDisabled();
 *
 *   it("should work with real Privy signatures", async () => {
 *     // Test code here
 *   });
 * });
 * ```
 */
export function skipIfLiveTestsDisabled(): void {
  if (!isLiveSignatureTestsEnabled()) {
    // eslint-disable-next-line no-console
    console.log(
      "Skipping live signature test. Set ENABLE_LIVE_SIGNATURE_TESTS=true to enable."
    );
  }
}

/**
 * Get a test skip condition for live signature tests.
 * Use with vitest's skipIf or onlyIf.
 *
 * @example
 * ```typescript
 * describe.skipIf(!isLiveSignatureTestsEnabled())("Live Tests", () => {
 *   // Tests here
 * });
 * ```
 */
export function shouldSkipLiveTests(): boolean {
  return !isLiveSignatureTestsEnabled();
}

