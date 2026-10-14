import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { clearNotionToken, getNotionAccessToken } from "./notion";

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
    const rowA = JSON.parse(sessionStorage.getItem(`${NOTION_KEY}:${WALLET_A}`) ?? "{}");
    expect(rowA).toEqual({ wallet: WALLET_A, token: { accessToken: "legacy-token" } });
    expect(await getNotionAccessToken(WALLET_B)).toBeNull();
  });

  it("moves an untagged legacy localStorage row onto the wallet key that read it", async () => {
    vi.mocked(hasEncryptionKey).mockReturnValue(false);
    localStorage.setItem(NOTION_KEY, JSON.stringify({ accessToken: "legacy-local" }));

    expect(await getNotionAccessToken(WALLET_A)).toBe("legacy-local");
    expect(localStorage.getItem(NOTION_KEY)).toBeNull();
    const rowA = JSON.parse(localStorage.getItem(`${NOTION_KEY}:${WALLET_A}`) ?? "{}");
    expect(rowA).toEqual({ wallet: WALLET_A, token: { accessToken: "legacy-local" } });
    expect(sessionStorage.length).toBe(0);
    expect(await getNotionAccessToken(WALLET_B)).toBeNull();
  });
});
