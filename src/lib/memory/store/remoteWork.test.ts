import { afterEach, describe, expect, it, vi } from "vitest";

import { type RemoteMemoryWorkPersistence, withRemoteWorkLease } from "./remoteWork";

const lease = {
  kind: "topics" as const,
  token: "owned",
  processor_version: "3",
  expires_at: "2026-10-21T00:00:00Z",
};
const persistence = (): RemoteMemoryWorkPersistence => ({
  claimWork: vi.fn(async () => lease),
  releaseWork: vi.fn(async () => {}),
});

afterEach(() => vi.useRealTimers());

describe("device maintenance leases", () => {
  it("does no inference while another device owns work", async () => {
    const p = persistence();
    vi.mocked(p.claimWork).mockResolvedValue(null);
    const task = vi.fn();
    expect(await withRemoteWorkLease(p, "topics", "3", task)).toBeNull();
    expect(task).not.toHaveBeenCalled();
    expect(p.releaseWork).not.toHaveBeenCalled();
  });

  it("renews long work and releases the token after completion", async () => {
    vi.useFakeTimers();
    const p = persistence();
    let finish!: (value: string) => void;
    const task = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const running = withRemoteWorkLease(p, "topics", "3", async (token) => {
      expect(token).toBe("owned");
      return task;
    });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(p.claimWork).toHaveBeenCalledTimes(3);
    expect(p.claimWork).toHaveBeenLastCalledWith("topics", "3", "owned");
    finish("done");
    expect(await running).toBe("done");
    expect(p.releaseWork).toHaveBeenCalledWith("topics", "owned");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(p.claimWork).toHaveBeenCalledTimes(3);
  });

  it("releases failed work so another device can resume it", async () => {
    const p = persistence();
    await expect(
      withRemoteWorkLease(p, "topics", "3", async () => {
        throw new Error("interrupted");
      })
    ).rejects.toThrow("interrupted");
    expect(p.releaseWork).toHaveBeenCalledWith("topics", "owned");
  });
});
