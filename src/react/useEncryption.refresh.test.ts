import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionState,
  encryptDataWithKey,
  getEncryptionKey,
  hasEncryptionKey,
  onKeyAvailable,
  refreshEncryptionKeyIfMatches,
  requestEncryptionKey,
} from "./useEncryption";

const ADDRESS = "0x1234567890123456789012345678901234567890";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((release) => {
    resolve = release;
  });
  return { promise, resolve };
}

describe("refreshEncryptionKeyIfMatches session teardown", () => {
  beforeEach(() => {
    clearAllEncryptionState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllEncryptionState();
  });

  describe.each(["v2", "v3"] as const)("%s probe", (version) => {
    describe.each(["fresh", "cached"] as const)("%s candidates", (source) => {
      it.each(["importKey", "decrypt"] as const)(
        "rejects the refresh after teardown during %s",
        async (operation) => {
          const signMessage = vi.fn(() => Promise.resolve(`0x${"11".repeat(65)}`));
          await requestEncryptionKey(ADDRESS, signMessage);
          const key = await getEncryptionKey(ADDRESS, version);
          const probe = `enc:${version}:${await encryptDataWithKey("chat history", key)}`;
          clearAllEncryptionState();

          if (source === "cached") {
            expect(await refreshEncryptionKeyIfMatches(ADDRESS, probe, signMessage)).toBe(true);
          }
          signMessage.mockClear();

          const paused = deferred();
          const resume = deferred();
          const importKey = crypto.subtle.importKey.bind(crypto.subtle);
          const decrypt = crypto.subtle.decrypt.bind(crypto.subtle);

          vi.spyOn(crypto.subtle, "importKey").mockImplementation(async (...args) => {
            const key = await importKey(...args);
            if (operation === "importKey" && key.algorithm.name === "AES-GCM") {
              paused.resolve();
              await resume.promise;
            }
            return key;
          });
          vi.spyOn(crypto.subtle, "decrypt").mockImplementation(async (...args) => {
            const plaintext = await decrypt(...args);
            if (operation === "decrypt") {
              paused.resolve();
              await resume.promise;
            }
            return plaintext;
          });

          const refresh = refreshEncryptionKeyIfMatches(ADDRESS, probe, signMessage);
          await paused.promise;
          clearAllEncryptionState();
          const listener = vi.fn();
          onKeyAvailable(ADDRESS, listener);
          resume.resolve();

          const refreshed = await refresh;
          expect(hasEncryptionKey(ADDRESS, "v2")).toBe(false);
          expect(hasEncryptionKey(ADDRESS, "v3")).toBe(false);
          expect(listener).not.toHaveBeenCalled();
          expect(refreshed).toBe(false);
          expect(signMessage).toHaveBeenCalledTimes(source === "cached" ? 0 : 1);

          vi.restoreAllMocks();
          signMessage.mockClear();

          expect(await refreshEncryptionKeyIfMatches(ADDRESS, probe, signMessage)).toBe(true);
          expect(hasEncryptionKey(ADDRESS, "v2")).toBe(true);
          expect(hasEncryptionKey(ADDRESS, "v3")).toBe(true);
          expect(listener).toHaveBeenCalledTimes(1);
          expect(signMessage).toHaveBeenCalledTimes(1);
        }
      );
    });
  });
});
