import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../react/useEncryption", () => ({
  encryptData: vi.fn(async (json: string) => `ciphertext:${json}`),
  decryptData: vi.fn(async () => {
    throw new Error("decryptData not used in these tests");
  }),
}));

import { clearTokenData, migrateUnencryptedTokens } from "./storage";

describe("migrateUnencryptedTokens", () => {
  const provider = "google-drive" as const;
  const walletAddress = "0x1234567890123456789012345678901234567890";
  const key = `oauth_token_${provider}`;
  const scopedKey = `oauth_token_${provider}:${walletAddress}`;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("migrates from sessionStorage when localStorage is empty", async () => {
    sessionStorage.setItem(
      key,
      JSON.stringify({ accessToken: "token-from-session", refreshToken: "rt" })
    );

    const migrated = await migrateUnencryptedTokens(provider, walletAddress);

    expect(migrated).toBe(true);
    expect(localStorage.getItem(scopedKey)).toMatch(/^enc:oauth:/);
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("migrates from localStorage when it contains a plaintext token", async () => {
    localStorage.setItem(
      key,
      JSON.stringify({ accessToken: "token-from-local", refreshToken: "rt" })
    );

    const migrated = await migrateUnencryptedTokens(provider, walletAddress);

    expect(migrated).toBe(true);
    expect(localStorage.getItem(scopedKey)).toMatch(/^enc:oauth:/);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("migrates sessionStorage even if localStorage is already encrypted", async () => {
    localStorage.setItem(key, "enc:oauth:already-encrypted");
    sessionStorage.setItem(key, JSON.stringify({ accessToken: "token-from-session" }));

    const migrated = await migrateUnencryptedTokens(provider, walletAddress);

    expect(migrated).toBe(true);
    expect(localStorage.getItem(scopedKey)).toMatch(/^enc:oauth:/);
    expect(localStorage.getItem(scopedKey)).not.toBe("enc:oauth:already-encrypted");
    expect(localStorage.getItem(key)).toBe("enc:oauth:already-encrypted");
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("clearTokenData clears tokens from both localStorage and sessionStorage", () => {
    localStorage.setItem(key, "local");
    sessionStorage.setItem(key, "session");

    clearTokenData(provider);

    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("clearTokenData with a wallet also clears the wallet-scoped row", () => {
    localStorage.setItem(key, "local");
    localStorage.setItem(scopedKey, "enc:oauth:scoped");
    sessionStorage.setItem(scopedKey, "scoped-session");

    clearTokenData(provider, walletAddress);

    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(scopedKey)).toBeNull();
    expect(sessionStorage.getItem(scopedKey)).toBeNull();
  });

  it("clearTokenData without a wallet still clears every wallet-suffixed row", () => {
    localStorage.setItem(scopedKey, "enc:oauth:scoped");
    sessionStorage.setItem(`oauth_token_${provider}:0xother`, "other-session");

    clearTokenData(provider);

    expect(localStorage.getItem(scopedKey)).toBeNull();
    expect(sessionStorage.getItem(`oauth_token_${provider}:0xother`)).toBeNull();
  });
});
