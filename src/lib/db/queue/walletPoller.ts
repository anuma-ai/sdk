/**
 * Wallet Poller
 *
 * Polls for embedded wallet availability during Privy initialization.
 * When a wallet becomes available, triggers a callback so the queue can flush.
 */

const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_MAX_ATTEMPTS = 60; // Stop after 60 seconds

export class WalletPoller {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private attempts = 0;

  /**
   * Start polling for wallet availability.
   *
   * @param checkWallet - Returns wallet address when ready, null if not yet available
   * @param onWalletReady - Called with the wallet address when it becomes available
   * @param intervalMs - Polling interval in milliseconds (default: 1000ms)
   * @param maxAttempts - Maximum polling attempts before giving up (default: 60)
   * @returns Stop function to cancel polling
   */
  startPolling(
    checkWallet: () => Promise<string | null>,
    onWalletReady: (address: string) => void,
    intervalMs: number = DEFAULT_INTERVAL_MS,
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS
  ): () => void {
    this.stop();
    this.attempts = 0;

    const poll = async () => {
      this.attempts++;

      if (this.attempts > maxAttempts) {
        this.stop();
        return;
      }

      try {
        const address = await checkWallet();
        if (address) {
          this.stop();
          onWalletReady(address);
        }
      } catch {
        // Ignore errors during polling, will retry on next interval
      }
    };

    // Poll immediately, then at interval
    poll();
    this.timerId = setInterval(poll, intervalMs);

    return () => this.stop();
  }

  /**
   * Stop polling.
   */
  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
