// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    await expect(result.current.deleteUserPreference("0xABC")).rejects.toThrow("Database not ready");
    // Legacy API path is guarded too.
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
      (props: { database: null }) => useSettings({ database: props.database, walletAddress: "0xABC" }),
      { initialProps: { database: null } }
    );
    const first = result.current.updateProfile;
    rerender({ database: null });
    // storageCtx stays null (same dep), so the callback identity is preserved.
    expect(result.current.updateProfile).toBe(first);
    vi.clearAllMocks();
  });
});
