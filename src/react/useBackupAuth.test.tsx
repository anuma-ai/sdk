import { act, render } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/backup/icloud/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/backup/icloud/api")>()),
  loadCloudKit: vi.fn(async () => {}),
  configureCloudKit: vi.fn(async () => {}),
  authenticateICloud: vi.fn(async () => ({ userRecordName: "icloud-user" })),
}));

import { type BackupAuthContextValue, BackupAuthProvider, useBackupAuth } from "./useBackupAuth";

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
