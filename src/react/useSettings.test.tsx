// @vitest-environment happy-dom
import type { Database } from "@nozbe/watermelondb";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
import { __resetPoolForTests } from "./userSettingsStore";
import { useSettings } from "./useSettings";

afterEach(() => {
  __resetPoolForTests();
});

describe("useSettings with a null database (not yet bound)", () => {
  it("renders inert without throwing and reports empty, not-loading state", () => {
    const { result } = renderHook(() => useSettings({ database: null, walletAddress: "0xABC" }));

    expect(result.current.userPreference).toBeNull();
    expect(result.current.modelPreference).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("rejects mutation callbacks with a clear 'not ready' error", async () => {
    const { result } = renderHook(() => useSettings({ database: null, walletAddress: "0xABC" }));

    await expect(result.current.updateProfile("0xABC", { nickname: "X" })).rejects.toThrow(
      "Database not ready"
    );
    await expect(result.current.setUserPreference("0xABC", { nickname: "X" })).rejects.toThrow(
      "Database not ready"
    );
    await expect(result.current.deleteUserPreference("0xABC")).rejects.toThrow(
      "Database not ready"
    );
    await expect(result.current.setModelPreference("0xABC", "gpt-4")).rejects.toThrow(
      "Database not ready"
    );
  });

  it("does not throw when the wallet is also absent", () => {
    expect(() =>
      renderHook(() => useSettings({ database: null, walletAddress: undefined }))
    ).not.toThrow();
  });
});

describe("useSettings own-name filter contract (never crashes on missing db)", () => {
  it("keeps a stable hook identity across a null → still-null render", () => {
    const { result, rerender } = renderHook(
      (props: { database: null }) =>
        useSettings({ database: props.database, walletAddress: "0xABC" }),
      { initialProps: { database: null } }
    );
    const first = result.current.updateProfile;
    rerender({ database: null });
    expect(result.current.updateProfile).toBe(first);
    vi.clearAllMocks();
  });
});

interface ObserveSubscriber {
  next: (records: unknown[]) => void;
}

function createFakeDatabase() {
  const observeSubscribers: ObserveSubscriber[] = [];
  const userPreferencesCollection = {
    table: "userPreferences",
    query: () => ({
      observeWithColumns: () => ({
        subscribe: (observer: { next: (records: unknown[]) => void }) => {
          const sub: ObserveSubscriber = { next: observer.next };
          observeSubscribers.push(sub);
          return {
            unsubscribe: () => {
              const idx = observeSubscribers.indexOf(sub);
              if (idx >= 0) observeSubscribers.splice(idx, 1);
            },
          };
        },
      }),
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
  return { database, observeSubscribers };
}

describe("useSettings with a bound database", () => {
  it("returns the saved wallet list and follows its changes", async () => {
    const first = '[{"chainType":"solana","address":"FAKE","addedAt":1}]';
    const second = '[{"chainType":"solana","address":"FAKE2","addedAt":2}]';
    vi.mocked(getUserPreferenceOp).mockResolvedValue({
      uniqueId: "rec-1",
      walletAddress: "0xABC",
      externalWallets: first,
      createdAt: 1,
      updatedAt: 1,
    });
    const { database, observeSubscribers } = createFakeDatabase();

    const { result } = renderHook(() => useSettings({ database, walletAddress: "0xABC" }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.userPreference?.externalWallets).toBe(first);

    act(() => {
      observeSubscribers[0]?.next([
        {
          id: "rec-1",
          walletAddress: "0xABC",
          externalWallets: second,
          createdAt: 1,
          updatedAt: 2,
        },
      ]);
    });

    expect(result.current.userPreference?.externalWallets).toBe(second);
  });
});
