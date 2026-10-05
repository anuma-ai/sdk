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
import { getStoredTokenData } from "../backup/oauth/storage";
import {
  clearGithubToken,
  getValidGithubToken,
  migrateGithubToken,
  storeGithubToken,
} from "./github";
import { clearDriveToken, getValidDriveToken, storeDriveToken } from "./google-drive";
import { clearCalendarToken, getValidCalendarToken, storeCalendarToken } from "./google-calendar";
import { getNotionAccessToken } from "./notion";

const WALLET_A = "0xaaaa";
const WALLET_B = "0xbbbb";
const GITHUB_KEY = "oauth_token_github";
const NOTION_KEY = "oauth_token_notion";
const DROPBOX_KEY = "oauth_token_dropbox";

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

  it("still reads a legacy row that carries no wallet field", async () => {
    localStorage.setItem(DROPBOX_KEY, JSON.stringify({ accessToken: "legacy-token" }));

    expect(await getStoredTokenData("dropbox", WALLET_A)).toEqual({
      accessToken: "legacy-token",
    });
  });
});
