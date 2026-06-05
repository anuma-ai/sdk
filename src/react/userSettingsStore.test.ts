/**
 * @vitest-environment happy-dom
 */
import type { Database } from "@nozbe/watermelondb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/db/userPreferences", async () => {
  const actual = await vi.importActual<typeof import("../lib/db/userPreferences")>(
    "../lib/db/userPreferences"
  );
  return {
    ...actual,
    getUserPreferenceOp: vi.fn(),
    migrateFromModelPreferencesOp: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("../lib/db/settings", async () => {
  const actual = await vi.importActual<typeof import("../lib/db/settings")>("../lib/db/settings");
  return {
    ...actual,
    getModelPreferenceOp: vi.fn().mockResolvedValue(null),
  };
});

import { getUserPreferenceOp } from "../lib/db/userPreferences";
import {
  __hasUserSettingsPoolEntryForTests,
  EMPTY_SNAPSHOT,
  getUserSettingsSnapshot,
  patchUserSettingsSnapshot,
  subscribeUserSettings,
} from "./userSettingsStore";

interface ObserveSubscriber {
  next: (records: unknown[]) => void;
}

/**
 * Fake Database whose `userPreferences` and `modelPreferences` collections
 * surface the chained `.query().observeWithColumns().subscribe()` call path
 * the store relies on, plus exposed counters so tests can assert call volume.
 */
function createFakeDatabase() {
  const observeSubscribers: ObserveSubscriber[] = [];
  const observeCalls: { columns: string[] }[] = [];
  const subscribeCalls: number[] = [];
  const unsubscribeCalls: number[] = [];

  const userPreferencesCollection = {
    table: "userPreferences",
    query: () => ({
      observeWithColumns: (columns: string[]) => {
        observeCalls.push({ columns });
        return {
          subscribe: (cb: (records: unknown[]) => void) => {
            subscribeCalls.push(Date.now());
            const sub: ObserveSubscriber = { next: cb };
            observeSubscribers.push(sub);
            return {
              unsubscribe: () => {
                unsubscribeCalls.push(Date.now());
                const idx = observeSubscribers.indexOf(sub);
                if (idx >= 0) observeSubscribers.splice(idx, 1);
              },
            };
          },
        };
      },
    }),
  };

  const modelPreferencesCollection = { table: "modelPreferences" };

  const database = {
    get: vi.fn((table: string) => {
      if (table === "userPreferences") return userPreferencesCollection;
      if (table === "modelPreferences") return modelPreferencesCollection;
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as Database;

  return { database, observeCalls, subscribeCalls, unsubscribeCalls, observeSubscribers };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserPreferenceOp).mockResolvedValue({
    uniqueId: "rec-1",
    walletAddress: "0xABC",
    nickname: "Initial",
    occupation: "",
    description: "",
    models: "",
    personality: "",
    createdAt: 1,
    updatedAt: 1,
  });
});

afterEach(() => {
  vi.resetModules();
});

describe("subscribeUserSettings — deduplication", () => {
  it("creates a single observe subscription regardless of subscriber count", () => {
    const { database, subscribeCalls } = createFakeDatabase();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();

    const unsubA = subscribeUserSettings(database, "0xABC", a);
    const unsubB = subscribeUserSettings(database, "0xABC", b);
    const unsubC = subscribeUserSettings(database, "0xABC", c);

    expect(subscribeCalls).toHaveLength(1);

    unsubA();
    unsubB();
    unsubC();
  });

  it("calls getUserPreferenceOp once for many concurrent subscribers", async () => {
    const { database } = createFakeDatabase();
    const listeners = Array.from({ length: 5 }, () => vi.fn());
    const cleanups = listeners.map((l) => subscribeUserSettings(database, "0xABC", l));

    // Allow the load promise to settle.
    await new Promise((r) => setTimeout(r, 0));

    expect(getUserPreferenceOp).toHaveBeenCalledTimes(1);

    cleanups.forEach((c) => c());
  });

  it("tears down the observe subscription only when the last subscriber leaves", () => {
    const { database, subscribeCalls, unsubscribeCalls } = createFakeDatabase();
    const a = vi.fn();
    const b = vi.fn();

    const unsubA = subscribeUserSettings(database, "0xABC", a);
    const unsubB = subscribeUserSettings(database, "0xABC", b);

    expect(subscribeCalls).toHaveLength(1);
    expect(unsubscribeCalls).toHaveLength(0);

    unsubA();
    expect(unsubscribeCalls).toHaveLength(0);

    unsubB();
    expect(unsubscribeCalls).toHaveLength(1);
    expect(__hasUserSettingsPoolEntryForTests(database, "0xABC")).toBe(false);
  });

  it("re-creates the entry on resubscribe after teardown", () => {
    const { database, subscribeCalls } = createFakeDatabase();
    const a = vi.fn();

    const unsubA = subscribeUserSettings(database, "0xABC", a);
    unsubA();
    expect(subscribeCalls).toHaveLength(1);

    const unsubB = subscribeUserSettings(database, "0xABC", a);
    expect(subscribeCalls).toHaveLength(2);
    unsubB();
  });

  it("isolates entries by walletAddress", () => {
    const { database, subscribeCalls } = createFakeDatabase();
    const cleanupA = subscribeUserSettings(database, "0xABC", vi.fn());
    const cleanupB = subscribeUserSettings(database, "0xDEF", vi.fn());
    expect(subscribeCalls).toHaveLength(2);
    cleanupA();
    cleanupB();
  });

  it("treats undefined walletAddress as a no-op", () => {
    const { database, subscribeCalls } = createFakeDatabase();
    const cleanup = subscribeUserSettings(database, undefined, vi.fn());
    expect(subscribeCalls).toHaveLength(0);
    cleanup();
  });
});

describe("snapshot lifecycle", () => {
  it("starts with EMPTY_SNAPSHOT", () => {
    const { database } = createFakeDatabase();
    expect(getUserSettingsSnapshot(database, "0xABC")).toBe(EMPTY_SNAPSHOT);
  });

  it("notifies all listeners when the load completes", async () => {
    const { database } = createFakeDatabase();
    const a = vi.fn();
    const b = vi.fn();
    const cleanupA = subscribeUserSettings(database, "0xABC", a);
    const cleanupB = subscribeUserSettings(database, "0xABC", b);

    await new Promise((r) => setTimeout(r, 0));

    // Both listeners should have been called at least once for the loaded
    // userPreference + isLoading transitions.
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    const snapshot = getUserSettingsSnapshot(database, "0xABC");
    expect(snapshot.userPreference?.nickname).toBe("Initial");
    expect(snapshot.isLoading).toBe(false);

    cleanupA();
    cleanupB();
  });

  it("delivers observe-driven updates to all listeners", async () => {
    const { database, observeSubscribers } = createFakeDatabase();
    const a = vi.fn();
    const cleanup = subscribeUserSettings(database, "0xABC", a);

    await new Promise((r) => setTimeout(r, 0));
    a.mockClear();

    // Simulate WatermelonDB pushing a new record.
    observeSubscribers[0]?.next([
      {
        id: "rec-1",
        walletAddress: "0xABC",
        nickname: "Updated",
        occupation: "Dev",
        description: "",
        models: "",
        personality: "",
        createdAt: 1,
        updatedAt: 2,
      },
    ]);

    expect(a).toHaveBeenCalled();
    expect(getUserSettingsSnapshot(database, "0xABC").userPreference?.nickname).toBe("Updated");

    cleanup();
  });
});

describe("patchUserSettingsSnapshot", () => {
  it("updates only the named fields and notifies", async () => {
    const { database } = createFakeDatabase();
    const a = vi.fn();
    const cleanup = subscribeUserSettings(database, "0xABC", a);
    await new Promise((r) => setTimeout(r, 0));
    a.mockClear();

    patchUserSettingsSnapshot(database, "0xABC", {
      userPreference: {
        uniqueId: "rec-1",
        walletAddress: "0xABC",
        nickname: "Patched",
        occupation: "",
        description: "",
        models: "",
        personality: "",
        createdAt: 1,
        updatedAt: 99,
      },
    });

    expect(a).toHaveBeenCalledTimes(1);
    const snapshot = getUserSettingsSnapshot(database, "0xABC");
    expect(snapshot.userPreference?.nickname).toBe("Patched");
    // isLoading not in the patch — preserved.
    expect(snapshot.isLoading).toBe(false);

    cleanup();
  });

  it("is a no-op when no entry exists", () => {
    const { database } = createFakeDatabase();
    expect(() => patchUserSettingsSnapshot(database, "0xABC", { isLoading: true })).not.toThrow();
    expect(getUserSettingsSnapshot(database, "0xABC")).toBe(EMPTY_SNAPSHOT);
  });

  it("is a no-op when walletAddress is undefined", () => {
    const { database } = createFakeDatabase();
    expect(() => patchUserSettingsSnapshot(database, undefined, { isLoading: true })).not.toThrow();
  });
});
