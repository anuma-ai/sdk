import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock useEncryption ──

vi.mock("../../react/useEncryption", () => ({
  getEncryptionKey: vi.fn(async () => "mock-crypto-key"),
  encryptDataWithKey: vi.fn(async (data: string) => `encrypted:${data}`),
  decryptDataWithKey: vi.fn(async (data: string) => {
    if (data.startsWith("encrypted:")) return data.slice("encrypted:".length);
    throw new Error("Decryption failed");
  }),
  hasEncryptionKey: vi.fn(() => true),
  encryptData: vi.fn(async (data: string) => `encrypted:${data}`),
  decryptData: vi.fn(async (data: string) => {
    if (data.startsWith("encrypted:")) return data.slice("encrypted:".length);
    throw new Error("Decryption failed");
  }),
}));

import { hasEncryptionKey } from "../../react/useEncryption";
import {
  getStoredTokenData,
  migrateUnencryptedTokens,
  storeTokenData as storeBackupToken,
} from "../backup/oauth/storage";
import {
  clearGithubToken,
  getValidGithubToken,
  migrateGithubToken,
  storeGithubToken,
} from "./github";
import {
  clearDriveToken,
  getValidDriveToken,
  migrateDriveToken,
  storeDriveToken,
} from "./google-drive";
import {
  clearCalendarToken,
  getValidCalendarToken,
  migrateCalendarToken,
  storeCalendarToken,
} from "./google-calendar";
import { getNotionAccessToken } from "./notion";

const WALLET_A = "0xaaaa";
const WALLET_B = "0xbbbb";
const GITHUB_KEY = "oauth_token_github";
const NOTION_KEY = "oauth_token_notion";
const DROPBOX_KEY = "oauth_token_dropbox";
const DRIVE_KEY = "oauth_token_google-drive-full";
const CALENDAR_KEY = "oauth_token_google-calendar";

function resetOAuthStores(): void {
  localStorage.clear();
  sessionStorage.clear();
  clearGithubToken(WALLET_A);
  clearDriveToken(WALLET_A);
  clearCalendarToken(WALLET_A);
}

describe("wallet-scoped OAuth token rows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOAuthStores();
    vi.mocked(hasEncryptionKey).mockReturnValue(true);
  });

  it("gives each wallet its own GitHub token through the plain text fallback", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);

    await storeGithubToken("tok-a", undefined, undefined, undefined, WALLET_A);
    await storeGithubToken("tok-b", undefined, undefined, undefined, WALLET_B);

    // The cache holds wallet B, so the read for A goes to storage.
    expect(await getValidGithubToken(WALLET_A)).toBe("tok-a");
    expect(await getValidGithubToken(WALLET_B)).toBe("tok-b");
  });

  it("keeps one plain text row per wallet for GitHub", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);

    await storeGithubToken("tok-a", undefined, undefined, undefined, WALLET_A);
    await storeGithubToken("tok-b", undefined, undefined, undefined, WALLET_B);

    const rowA = JSON.parse(sessionStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`) ?? "{}");
    const rowB = JSON.parse(sessionStorage.getItem(`${GITHUB_KEY}:${WALLET_B}`) ?? "{}");
    expect(rowA).toEqual({ wallet: WALLET_A, token: { accessToken: "tok-a" } });
    expect(rowB).toEqual({ wallet: WALLET_B, token: { accessToken: "tok-b" } });
  });

  it("writes only the wallet-scoped encrypted key when the key is ready", async () => {
    await storeGithubToken("tok-a", undefined, undefined, undefined, WALLET_A);

    expect(localStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`)).toMatch(/^enc:oauth:/);
    expect(sessionStorage.getItem(GITHUB_KEY)).toBeNull();
    expect(await getValidGithubToken(WALLET_A)).toBe("tok-a");
    // The second wallet has no row of its own, so it gets nothing.
    expect(await getValidGithubToken(WALLET_B)).toBeNull();
  });

  it("uses the sessionStorage row when the localStorage row under the same key is not readable", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);

    // An older build left an encrypted row in localStorage and a plain text row
    // under the same key in sessionStorage. The key is not ready, so only the
    // plain text row can answer.
    localStorage.setItem(`${GITHUB_KEY}:${WALLET_A}`, "enc:oauth:not-readable");
    sessionStorage.setItem(
      `${GITHUB_KEY}:${WALLET_A}`,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "tok-a" } })
    );

    expect(await getValidGithubToken(WALLET_A)).toBe("tok-a");
  });

  it("migrates the plain text row of the same wallet into the encrypted copy", async () => {
    sessionStorage.setItem(
      `${GITHUB_KEY}:${WALLET_A}`,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "tok-a" } })
    );

    expect(await migrateGithubToken(WALLET_A)).toBe(true);
    expect(localStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`)).toMatch(/^enc:oauth:/);
    expect(sessionStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`)).toBeNull();
  });

  it("gives each wallet its own Drive token through the plain text fallback", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);

    await storeDriveToken("tok-a", undefined, undefined, undefined, WALLET_A);
    await storeDriveToken("tok-b", undefined, undefined, undefined, WALLET_B);

    expect(await getValidDriveToken(WALLET_A)).toBe("tok-a");
    expect(await getValidDriveToken(WALLET_B)).toBe("tok-b");
  });

  it("gives each wallet its own Calendar token through the plain text fallback", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);

    await storeCalendarToken("tok-a", undefined, undefined, undefined, WALLET_A);
    await storeCalendarToken("tok-b", undefined, undefined, undefined, WALLET_B);

    expect(await getValidCalendarToken(WALLET_A)).toBe("tok-a");
    expect(await getValidCalendarToken(WALLET_B)).toBe("tok-b");
  });

  it("reads the owner row of each wallet for Notion", async () => {
    sessionStorage.setItem(
      `${NOTION_KEY}:${WALLET_A}`,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "tok-a" } })
    );
    sessionStorage.setItem(
      `${NOTION_KEY}:${WALLET_B}`,
      JSON.stringify({ wallet: WALLET_B, token: { accessToken: "tok-b" } })
    );

    expect(await getNotionAccessToken(WALLET_A)).toBe("tok-a");
    expect(await getNotionAccessToken(WALLET_B)).toBe("tok-b");
  });

  it("accepts the owner row and rejects the other wallet row in the backup store", async () => {
    sessionStorage.setItem(
      DROPBOX_KEY,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "tok-a" } })
    );

    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({ accessToken: "tok-a" });
    expect(await getStoredTokenData("dropbox", WALLET_B)).toBeNull();
  });

  it("keeps one encrypted backup row per wallet in the backup store", async () => {
    await storeBackupToken("dropbox", { accessToken: "tok-a" }, WALLET_A);
    await storeBackupToken("dropbox", { accessToken: "tok-b" }, WALLET_B);

    // Each wallet has its own key, so neither write overwrites the other.
    expect(localStorage.getItem(`${DROPBOX_KEY}:${WALLET_A}`)).toMatch(/^enc:oauth:/);
    expect(localStorage.getItem(`${DROPBOX_KEY}:${WALLET_B}`)).toMatch(/^enc:oauth:/);
    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({ accessToken: "tok-a" });
    expect(await getStoredTokenData("dropbox", WALLET_B)).toEqual({ accessToken: "tok-b" });
  });

  it("still reads a legacy row that carries no wallet field", async () => {
    localStorage.setItem(DROPBOX_KEY, JSON.stringify({ accessToken: "legacy-token" }));

    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({
      accessToken: "legacy-token",
    });
  });

  it("moves an untagged legacy row onto the wallet key that read it", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);
    sessionStorage.setItem(GITHUB_KEY, JSON.stringify({ accessToken: "legacy-token" }));

    // Wallet A reads first, so the row becomes A's and the shared key is gone.
    expect(await getValidGithubToken(WALLET_A)).toBe("legacy-token");
    expect(sessionStorage.getItem(GITHUB_KEY)).toBeNull();
    const rowA = JSON.parse(sessionStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`) ?? "{}");
    expect(rowA).toEqual({ wallet: WALLET_A, token: { accessToken: "legacy-token" } });
    // Wallet B has no row of its own, so it gets nothing.
    expect(await getValidGithubToken(WALLET_B)).toBeNull();
  });

  it("moves an untagged legacy row in the backup store the same way", async () => {
    sessionStorage.setItem(DROPBOX_KEY, JSON.stringify({ accessToken: "legacy-token" }));

    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({
      accessToken: "legacy-token",
    });
    expect(sessionStorage.getItem(DROPBOX_KEY)).toBeNull();
    expect(await getStoredTokenData("dropbox", WALLET_B)).toBeNull();
  });

  it("needs the wallet address to read an owner-tagged backup row", async () => {
    sessionStorage.setItem(
      DROPBOX_KEY,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "tok-a" } })
    );

    expect(await getStoredTokenData("dropbox")).toBeNull();
    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({ accessToken: "tok-a" });
  });

  it("drops the plain text row when the encrypted write lands", async () => {
    sessionStorage.setItem(
      `${GITHUB_KEY}:${WALLET_A}`,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "old-token" } })
    );

    await storeGithubToken("new-token", undefined, undefined, undefined, WALLET_A);

    expect(localStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`)).toMatch(/^enc:oauth:/);
    expect(sessionStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`)).toBeNull();
    expect(await getValidGithubToken(WALLET_A)).toBe("new-token");
  });

  it("drops the plain text backup row when the encrypted write lands", async () => {
    sessionStorage.setItem(
      `${DROPBOX_KEY}:${WALLET_A}`,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "old-token" } })
    );

    await storeBackupToken("dropbox", { accessToken: "new-token" }, WALLET_A);

    expect(localStorage.getItem(`${DROPBOX_KEY}:${WALLET_A}`)).toMatch(/^enc:oauth:/);
    expect(sessionStorage.getItem(`${DROPBOX_KEY}:${WALLET_A}`)).toBeNull();
    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({ accessToken: "new-token" });
  });

  it("keeps the other wallet row when the migration uses the scoped row", async () => {
    sessionStorage.setItem(
      `${GITHUB_KEY}:${WALLET_A}`,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "tok-a" } })
    );
    sessionStorage.setItem(
      GITHUB_KEY,
      JSON.stringify({ wallet: WALLET_B, token: { accessToken: "tok-b" } })
    );

    expect(await migrateGithubToken(WALLET_A)).toBe(true);

    expect(localStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`)).toMatch(/^enc:oauth:/);
    expect(sessionStorage.getItem(`${GITHUB_KEY}:${WALLET_A}`)).toBeNull();
    // Wallet B still owns the row under the shared key.
    expect(sessionStorage.getItem(GITHUB_KEY)).toContain("tok-b");
    expect(await getValidGithubToken(WALLET_B)).toBe("tok-b");
  });
  it.each([
    { name: "GitHub", key: GITHUB_KEY, read: getValidGithubToken, migrate: migrateGithubToken },
    { name: "Drive", key: DRIVE_KEY, read: getValidDriveToken, migrate: migrateDriveToken },
    {
      name: "Calendar",
      key: CALENDAR_KEY,
      read: getValidCalendarToken,
      migrate: migrateCalendarToken,
    },
  ])(
    "encrypts a legacy localStorage row that a read moved first ($name)",
    async ({ key, read, migrate }) => {
      vi.mocked(hasEncryptionKey).mockReturnValue(false);
      localStorage.setItem(key, JSON.stringify({ accessToken: "legacy-token" }));

      // The read runs before the key is ready and moves the row to the wallet key.
      expect(await read(WALLET_A)).toBe("legacy-token");
      expect(localStorage.getItem(key)).toBeNull();
      expect(localStorage.getItem(`${key}:${WALLET_A}`)).not.toMatch(/^enc:oauth:/);

      vi.mocked(hasEncryptionKey).mockReturnValue(true);
      expect(await migrate(WALLET_A)).toBe(true);

      expect(localStorage.getItem(`${key}:${WALLET_A}`)).toMatch(/^enc:oauth:/);
      expect(await read(WALLET_A)).toBe("legacy-token");
    }
  );

  it("keeps the encrypted legacy backup row of another wallet during a migration", async () => {
    // An older build wrote wallet A's encrypted row under the shared key.
    await storeBackupToken("dropbox", { accessToken: "tok-a" }, WALLET_A);
    const rowA = localStorage.getItem(`${DROPBOX_KEY}:${WALLET_A}`) ?? "";
    localStorage.removeItem(`${DROPBOX_KEY}:${WALLET_A}`);
    localStorage.setItem(DROPBOX_KEY, rowA);
    sessionStorage.setItem(
      `${DROPBOX_KEY}:${WALLET_B}`,
      JSON.stringify({ wallet: WALLET_B, token: { accessToken: "tok-b" } })
    );

    expect(await migrateUnencryptedTokens("dropbox", WALLET_B)).toBe(true);

    expect(localStorage.getItem(`${DROPBOX_KEY}:${WALLET_B}`)).toMatch(/^enc:oauth:/);
    expect(localStorage.getItem(DROPBOX_KEY)).toBe(rowA);
    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({ accessToken: "tok-a" });
  });

  it("drops a plain text legacy backup row during a migration", async () => {
    localStorage.setItem(DROPBOX_KEY, JSON.stringify({ accessToken: "legacy-token" }));
    sessionStorage.setItem(
      `${DROPBOX_KEY}:${WALLET_B}`,
      JSON.stringify({ wallet: WALLET_B, token: { accessToken: "tok-b" } })
    );

    expect(await migrateUnencryptedTokens("dropbox", WALLET_B)).toBe(true);

    expect(localStorage.getItem(DROPBOX_KEY)).toBeNull();
  });
});
