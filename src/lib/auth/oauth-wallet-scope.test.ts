import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../react/useEncryption", () => ({
  getEncryptionKey: vi.fn(() => Promise.resolve("mock-crypto-key")),
  encryptDataWithKey: vi.fn((data: string) => Promise.resolve(`encrypted:${data}`)),
  decryptDataWithKey: vi.fn((data: string) => {
    if (data.startsWith("encrypted:")) return Promise.resolve(data.slice("encrypted:".length));
    return Promise.reject(new Error("Decryption failed"));
  }),
  hasEncryptionKey: vi.fn(() => true),
  encryptData: vi.fn((data: string) => Promise.resolve(`encrypted:${data}`)),
  decryptData: vi.fn((data: string) => {
    if (data.startsWith("encrypted:")) return Promise.resolve(data.slice("encrypted:".length));
    return Promise.reject(new Error("Decryption failed"));
  }),
}));

import { hasEncryptionKey } from "../../react/useEncryption";
import { clearNotionToken, getNotionAccessToken, revokeNotionAccess } from "./notion";

const WALLET_A = "0xaaaa";
const WALLET_B = "0xbbbb";
const NOTION_KEY = "oauth_token_notion";

function resetOAuthStores(): void {
  localStorage.clear();
  sessionStorage.clear();
  clearNotionToken(WALLET_A);
  clearNotionToken(WALLET_B);
}

describe("wallet-scoped OAuth token rows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOAuthStores();
    vi.mocked(hasEncryptionKey).mockReturnValue(true);
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

  it("rejects a row tagged with another wallet", async () => {
    sessionStorage.setItem(
      NOTION_KEY,
      JSON.stringify({ wallet: WALLET_B, token: { accessToken: "tok-b" } })
    );

    expect(await getNotionAccessToken(WALLET_A)).toBeNull();
  });

  it.each([
    ["clearNotionToken", clearNotionToken],
    ["revokeNotionAccess", revokeNotionAccess],
  ])("removes legacy tokens before an account switch after %s", async (_name, clearToken) => {
    const token = {
      accessToken: "tok-a",
      refreshToken: "refresh-a",
      expiresAt: Date.now() + 3600000,
    };
    const scopedKey = `${NOTION_KEY}:${WALLET_A}`;
    const scopedRow = JSON.stringify({ wallet: WALLET_A, token });
    const legacyRow = JSON.stringify(token);
    localStorage.setItem(scopedKey, scopedRow);
    localStorage.setItem(NOTION_KEY, legacyRow);
    sessionStorage.setItem(scopedKey, scopedRow);
    sessionStorage.setItem(NOTION_KEY, legacyRow);
    expect(await getNotionAccessToken(WALLET_A)).toBe(token.accessToken);

    clearToken(WALLET_A);

    expect(localStorage.getItem(NOTION_KEY)).toBeNull();
    expect(localStorage.getItem(scopedKey)).toBeNull();
    expect(sessionStorage.getItem(NOTION_KEY)).toBeNull();
    expect(sessionStorage.getItem(scopedKey)).toBeNull();
    expect(await getNotionAccessToken(WALLET_B)).toBeNull();
    expect(localStorage.getItem(`${NOTION_KEY}:${WALLET_B}`)).toBeNull();
    expect(sessionStorage.getItem(`${NOTION_KEY}:${WALLET_B}`)).toBeNull();
  });

  it.each([
    ["clearNotionToken", clearNotionToken],
    ["revokeNotionAccess", revokeNotionAccess],
  ])("removes legacy-only tokens before an account switch after %s", async (_name, clearToken) => {
    localStorage.setItem(
      NOTION_KEY,
      JSON.stringify({ accessToken: "legacy-access", refreshToken: "legacy-refresh" })
    );

    clearToken(WALLET_A);

    expect(await getNotionAccessToken(WALLET_B)).toBeNull();
    expect(localStorage.getItem(NOTION_KEY)).toBeNull();
    expect(localStorage.getItem(`${NOTION_KEY}:${WALLET_B}`)).toBeNull();
    expect(sessionStorage.getItem(`${NOTION_KEY}:${WALLET_B}`)).toBeNull();
  });

  it("uses the sessionStorage row when the localStorage row under the same key is not readable", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);

    localStorage.setItem(`${NOTION_KEY}:${WALLET_A}`, "enc:oauth:not-readable");
    sessionStorage.setItem(
      `${NOTION_KEY}:${WALLET_A}`,
      JSON.stringify({ wallet: WALLET_A, token: { accessToken: "tok-a" } })
    );

    expect(await getNotionAccessToken(WALLET_A)).toBe("tok-a");
  });

  it("moves an untagged legacy row onto the wallet key that read it", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);
    sessionStorage.setItem(NOTION_KEY, JSON.stringify({ accessToken: "legacy-token" }));

    expect(await getNotionAccessToken(WALLET_A)).toBe("legacy-token");
    expect(sessionStorage.getItem(NOTION_KEY)).toBeNull();
    const rowA: unknown = JSON.parse(sessionStorage.getItem(`${NOTION_KEY}:${WALLET_A}`) ?? "{}");
    expect(rowA).toEqual({ wallet: WALLET_A, token: { accessToken: "legacy-token" } });
    expect(await getNotionAccessToken(WALLET_B)).toBeNull();
  });

  it("moves an untagged legacy localStorage row onto the wallet key that read it", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);
    localStorage.setItem(NOTION_KEY, JSON.stringify({ accessToken: "legacy-local" }));

    expect(await getNotionAccessToken(WALLET_A)).toBe("legacy-local");
    expect(localStorage.getItem(NOTION_KEY)).toBeNull();
    const rowA: unknown = JSON.parse(localStorage.getItem(`${NOTION_KEY}:${WALLET_A}`) ?? "{}");
    expect(rowA).toEqual({ wallet: WALLET_A, token: { accessToken: "legacy-local" } });
    expect(sessionStorage.length).toBe(0);
    expect(await getNotionAccessToken(WALLET_B)).toBeNull();
  });
});
