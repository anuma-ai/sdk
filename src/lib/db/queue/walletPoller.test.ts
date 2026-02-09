import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WalletPoller } from "./walletPoller";

describe("WalletPoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onWalletReady when wallet becomes available", async () => {
    const poller = new WalletPoller();
    const onWalletReady = vi.fn();

    let callCount = 0;
    const checkWallet = vi.fn(async () => {
      callCount++;
      return callCount >= 3 ? "0x1234567890123456789012345678901234567890" : null;
    });

    poller.startPolling(checkWallet, onWalletReady, 100);

    // First call is immediate
    await vi.advanceTimersByTimeAsync(0);
    expect(checkWallet).toHaveBeenCalledTimes(1);
    expect(onWalletReady).not.toHaveBeenCalled();

    // Second call after interval
    await vi.advanceTimersByTimeAsync(100);
    expect(checkWallet).toHaveBeenCalledTimes(2);
    expect(onWalletReady).not.toHaveBeenCalled();

    // Third call - wallet now available
    await vi.advanceTimersByTimeAsync(100);
    expect(checkWallet).toHaveBeenCalledTimes(3);
    expect(onWalletReady).toHaveBeenCalledWith("0x1234567890123456789012345678901234567890");
  });

  it("should stop polling after finding wallet", async () => {
    const poller = new WalletPoller();
    const onWalletReady = vi.fn();
    const checkWallet = vi.fn(async () => "0x1234567890123456789012345678901234567890");

    poller.startPolling(checkWallet, onWalletReady, 100);

    // Immediate call finds wallet
    await vi.advanceTimersByTimeAsync(0);
    expect(onWalletReady).toHaveBeenCalledTimes(1);

    // No more calls after finding wallet
    await vi.advanceTimersByTimeAsync(500);
    expect(checkWallet).toHaveBeenCalledTimes(1);
  });

  it("should stop after maxAttempts", async () => {
    const poller = new WalletPoller();
    const onWalletReady = vi.fn();
    const checkWallet = vi.fn(async () => null);

    poller.startPolling(checkWallet, onWalletReady, 100, 3);

    // 3 attempts: immediate + 2 intervals
    await vi.advanceTimersByTimeAsync(0); // attempt 1
    await vi.advanceTimersByTimeAsync(100); // attempt 2
    await vi.advanceTimersByTimeAsync(100); // attempt 3
    await vi.advanceTimersByTimeAsync(100); // should not fire

    expect(checkWallet).toHaveBeenCalledTimes(3);
    expect(onWalletReady).not.toHaveBeenCalled();
  });

  it("should return a stop function", async () => {
    const poller = new WalletPoller();
    const onWalletReady = vi.fn();
    const checkWallet = vi.fn(async () => null);

    const stopFn = poller.startPolling(checkWallet, onWalletReady, 100);

    await vi.advanceTimersByTimeAsync(0); // first call
    stopFn();

    await vi.advanceTimersByTimeAsync(500);
    // Only the initial call happened
    expect(checkWallet).toHaveBeenCalledTimes(1);
  });

  it("should handle errors in checkWallet gracefully", async () => {
    const poller = new WalletPoller();
    const onWalletReady = vi.fn();

    let callCount = 0;
    const checkWallet = vi.fn(async () => {
      callCount++;
      if (callCount === 1) throw new Error("Network error");
      return "0x1234567890123456789012345678901234567890";
    });

    poller.startPolling(checkWallet, onWalletReady, 100);

    // First call throws, should continue
    await vi.advanceTimersByTimeAsync(0);
    expect(onWalletReady).not.toHaveBeenCalled();

    // Second call succeeds
    await vi.advanceTimersByTimeAsync(100);
    expect(onWalletReady).toHaveBeenCalledWith("0x1234567890123456789012345678901234567890");
  });
});
