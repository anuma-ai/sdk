import { act, render, renderHook, waitFor } from "@testing-library/react";
import React, { type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateICloud } from "../lib/backup/icloud/api";
import { type BackupAuthContextValue, BackupAuthProvider, useBackupAuth } from "./useBackupAuth";
import { ICloudAuthProvider, useICloudAuth } from "./useICloudAuth";

vi.mock("../lib/backup/icloud/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/backup/icloud/api")>()),
  loadCloudKit: vi.fn(async () => {}),
  configureCloudKit: vi.fn(async () => {}),
  authenticateICloud: vi.fn(async () => ({ userRecordName: "icloud-user" })),
}));

const WALLET = "0x" + "a".repeat(40);
const LOCAL_ROW = JSON.stringify({ accessToken: "dbx-legacy" });
const SESSION_ROW = JSON.stringify({ accessToken: "gd-legacy" });

function storageEntries(storage: Storage): Record<string, string | null> {
  const entries: Record<string, string | null> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null) entries[key] = storage.getItem(key);
  }
  return entries;
}

describe("BackupAuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("exposes only iCloud and leaves stored token rows alone", async () => {
    localStorage.setItem("oauth_token_dropbox", LOCAL_ROW);
    sessionStorage.setItem("oauth_token_google-drive", SESSION_ROW);

    let ctx: BackupAuthContextValue | null = null;
    function Probe() {
      ctx = useBackupAuth();
      return null;
    }

    render(
      <BackupAuthProvider walletAddress={WALLET}>
        <Probe />
      </BackupAuthProvider>
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const value = ctx as unknown as BackupAuthContextValue;
    expect(Object.keys(value).sort()).toEqual([
      "hasAnyAuthentication",
      "hasAnyProvider",
      "icloud",
      "logoutAll",
    ]);
    expect(value.hasAnyProvider).toBe(false);
    expect(value.hasAnyAuthentication).toBe(false);
    expect(value.icloud.isConfigured).toBe(false);
    await expect(value.logoutAll()).resolves.toBeUndefined();

    expect(storageEntries(localStorage)).toEqual({ oauth_token_dropbox: LOCAL_ROW });
    expect(storageEntries(sessionStorage)).toEqual({ "oauth_token_google-drive": SESSION_ROW });
  });

  it("accepts the props the client passes", () => {
    const { unmount } = render(
      <BackupAuthProvider
        walletAddress={WALLET}
        icloudApiToken={undefined}
        icloudContainerIdentifier="iCloud.Memoryless"
        icloudEnvironment="production"
      >
        <span />
      </BackupAuthProvider>
    );
    unmount();
  });

  it("reports iCloud when it is configured and signed in, and logoutAll signs it out", async () => {
    let ctx: BackupAuthContextValue | null = null;
    function Probe() {
      ctx = useBackupAuth();
      return null;
    }

    render(
      <BackupAuthProvider icloudApiToken="cloudkit-token">
        <Probe />
      </BackupAuthProvider>
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const signedIn = ctx as unknown as BackupAuthContextValue;
    expect(signedIn.hasAnyProvider).toBe(true);
    expect(signedIn.hasAnyAuthentication).toBe(true);
    expect(signedIn.icloud.isConfigured).toBe(true);
    expect(signedIn.icloud.accessToken).toBe("icloud-user");

    await act(async () => {
      await signedIn.logoutAll();
    });

    const signedOut = ctx as unknown as BackupAuthContextValue;
    expect(signedOut.hasAnyProvider).toBe(true);
    expect(signedOut.hasAnyAuthentication).toBe(false);
    expect(signedOut.icloud.isAuthenticated).toBe(false);
    expect(signedOut.icloud.accessToken).toBeNull();
  });
});

describe("iCloud sign-in", () => {
  it.each([
    {
      name: "useBackupAuth",
      useAuth: () => useBackupAuth().icloud,
      wrapper: ({ children }: PropsWithChildren) => (
        <BackupAuthProvider icloudApiToken="cloudkit-token">{children}</BackupAuthProvider>
      ),
    },
    {
      name: "useICloudAuth",
      useAuth: useICloudAuth,
      wrapper: ({ children }: PropsWithChildren) => (
        <ICloudAuthProvider apiToken="cloudkit-token">{children}</ICloudAuthProvider>
      ),
    },
  ])("cancels a pending request through $name", async ({ useAuth, wrapper }) => {
    vi.mocked(authenticateICloud).mockResolvedValueOnce(null);
    const whenUserSignsIn = vi.fn(() => new Promise<never>(() => {}));
    vi.stubGlobal("CloudKit", {
      getDefaultContainer: () => ({ setUpAuth: () => Promise.resolve(null), whenUserSignsIn }),
    });

    try {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isConfigured).toBe(true));
      vi.useFakeTimers();

      const controller = new AbortController();
      const rejected = vi.fn();
      void result.current.requestAccess({ signal: controller.signal }).catch(rejected);
      await vi.advanceTimersByTimeAsync(0);
      expect(whenUserSignsIn).toHaveBeenCalledOnce();

      controller.abort();
      await vi.advanceTimersByTimeAsync(0);

      expect(rejected).toHaveBeenCalledExactlyOnceWith(new Error("Sign-in was cancelled"));
      expect(result.current.isAuthenticated).toBe(false);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
