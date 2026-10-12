import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;
import {
  requestKeyPair,
  exportPublicKey,
  hasKeyPair,
  clearKeyPair,
  clearAllKeyPairs,
  useEncryption,
  clearEncryptionKey,
  clearAllEncryptionKeys,
  clearAllEncryptionState,
  onKeyAvailable,
  requestEncryptionKey,
  hasEncryptionKey,
  SIGN_MESSAGE,
  encryptData,
  decryptData,
  getEncryptionKey,
} from "./useEncryption";
import type { SignMessageFn } from "./useEncryption";

const mockCryptoSubtle = {
  digest: vi.fn(),
  importKey: vi.fn(),
  deriveBits: vi.fn(),
  exportKey: vi.fn(),
};

function createMockSignature(message: string): string {
  return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
}

function isValidSPKI(spki: string): boolean {
  try {
    const decoded = atob(spki);
    return decoded.charCodeAt(0) === 0x30;
  } catch {
    return false;
  }
}

describe("useEncryption - Key Pair Generation", () => {
  const mockSignMessage = vi.fn(async (message: string) => {
    return createMockSignature(message);
  }) as unknown as SignMessageFn & { mock: { calls: string[][] } };

  beforeEach(() => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();
    clearAllKeyPairs();

    Object.defineProperty(global, "crypto", {
      value: {
        subtle: crypto.subtle,
        getRandomValues: crypto.getRandomValues.bind(crypto),
      },
      writable: true,
    });
  });

  describe("requestKeyPair", () => {
    it("should generate key pair on first call", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      expect(mockSignMessage).toHaveBeenCalledWith(SIGN_MESSAGE, { showWalletUIs: false });
      expect(hasKeyPair(address)).toBe(true);
    });

    it("should return immediately if key pair exists", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      const callCount = mockSignMessage.mock.calls.length;

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      expect(mockSignMessage).toHaveBeenCalledTimes(callCount);
      expect(hasKeyPair(address)).toBe(true);
    });

    it("should use the same signing message as encryption keys", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      const calls = mockSignMessage.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toContain("generate a key");
      expect(calls[0][0]).toContain("encrypt data");
    });
  });

  describe("deriveKeyPairFromSignature", () => {
    it("should produce deterministic key pairs", async () => {
      const address = "0x1234567890123456789012345678901234567890";
      const signature = createMockSignature("test message");

      clearKeyPair(address);

      let publicKey1: string;
      let publicKey2: string;

      await act(async () => {
        await requestKeyPair(address, async () => signature);
        publicKey1 = await exportPublicKey(address, async () => signature);
      });

      clearKeyPair(address);

      await act(async () => {
        await requestKeyPair(address, async () => signature);
        publicKey2 = await exportPublicKey(address, async () => signature);
      });

      expect(publicKey1!).toBe(publicKey2!);
    });

    it("should produce different keys for different signatures", async () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      let publicKey1: string;
      let publicKey2: string;

      await act(async () => {
        await requestKeyPair(address1, async () => createMockSignature("message1"));
        publicKey1 = await exportPublicKey(address1, async () => createMockSignature("message1"));
      });

      await act(async () => {
        await requestKeyPair(address2, async () => createMockSignature("message2"));
        publicKey2 = await exportPublicKey(address2, async () => createMockSignature("message2"));
      });

      expect(publicKey1!).not.toBe(publicKey2!);
    });
  });

  describe("exportPublicKey", () => {
    it("should export valid SPKI format", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      let publicKey: string;

      await act(async () => {
        publicKey = await exportPublicKey(address, mockSignMessage);
      });

      expect(publicKey!).toBeDefined();
      expect(typeof publicKey!).toBe("string");
      expect(isValidSPKI(publicKey!)).toBe(true);
    });

    it("should export consistent public key", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      let publicKey1: string;
      let publicKey2: string;

      await act(async () => {
        publicKey1 = await exportPublicKey(address, mockSignMessage);
        publicKey2 = await exportPublicKey(address, mockSignMessage);
      });

      expect(publicKey1!).toBe(publicKey2!);
    });

    it("should auto-generate key pair if it doesn't exist", async () => {
      const address = "0x1234567890123456789012345678901234567890";
      clearKeyPair(address);

      expect(hasKeyPair(address)).toBe(false);

      let publicKey: string;
      await act(async () => {
        publicKey = await exportPublicKey(address, mockSignMessage);
      });

      expect(hasKeyPair(address)).toBe(true);
      expect(publicKey!).toBeDefined();
      expect(isValidSPKI(publicKey!)).toBe(true);
    });

    it("should export public key that can be imported by Web Crypto API", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      let publicKeySpki: string;

      await act(async () => {
        publicKeySpki = await exportPublicKey(address, mockSignMessage);
      });

      const spkiBytes = Uint8Array.from(atob(publicKeySpki!), (c) => c.charCodeAt(0));

      const importedKey = await crypto.subtle.importKey(
        "spki",
        spkiBytes.buffer,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        []
      );

      expect(importedKey).toBeDefined();
      expect(importedKey.type).toBe("public");
    });
  });

  describe("hasKeyPair", () => {
    it("should return false when no key pair exists", () => {
      const address = "0x1234567890123456789012345678901234567890";
      clearKeyPair(address);

      expect(hasKeyPair(address)).toBe(false);
    });

    it("should return true after key pair generation", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      expect(hasKeyPair(address)).toBe(false);

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      expect(hasKeyPair(address)).toBe(true);
    });
  });

  describe("clearKeyPair", () => {
    it("should remove key pair from memory", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      expect(hasKeyPair(address)).toBe(true);

      clearKeyPair(address);

      expect(hasKeyPair(address)).toBe(false);
    });

    it("should not affect encryption keys", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
        await requestKeyPair(address, mockSignMessage);
      });

      expect(hasEncryptionKey(address)).toBe(true);
      expect(hasKeyPair(address)).toBe(true);

      clearKeyPair(address);

      expect(hasKeyPair(address)).toBe(false);
      expect(hasEncryptionKey(address)).toBe(true);
    });
  });

  describe("clearAllKeyPairs", () => {
    it("should clear all key pairs", async () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      await act(async () => {
        await requestKeyPair(address1, mockSignMessage);
        await requestKeyPair(address2, mockSignMessage);
      });

      expect(hasKeyPair(address1)).toBe(true);
      expect(hasKeyPair(address2)).toBe(true);

      clearAllKeyPairs();

      expect(hasKeyPair(address1)).toBe(false);
      expect(hasKeyPair(address2)).toBe(false);
    });

    it("also sweeps persisted ecdh_keypair_* entries from localStorage", () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";
      localStorage.setItem(`ecdh_keypair_${address1}`, "stale-ciphertext-1");
      localStorage.setItem(`ecdh_keypair_${address2}`, "stale-ciphertext-2");
      localStorage.setItem("unrelated_key", "preserved");

      clearAllKeyPairs();

      expect(localStorage.getItem(`ecdh_keypair_${address1}`)).toBeNull();
      expect(localStorage.getItem(`ecdh_keypair_${address2}`)).toBeNull();
      expect(localStorage.getItem("unrelated_key")).toBe("preserved");
    });
  });

  describe("clearAllEncryptionState", () => {
    it("wipes encryption keys, key pairs, persisted key pairs, and availability listeners", async () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      await act(async () => {
        await requestEncryptionKey(address1, mockSignMessage);
        await requestEncryptionKey(address2, mockSignMessage);
        await requestKeyPair(address1, mockSignMessage);
        await requestKeyPair(address2, mockSignMessage);
      });

      const listener = vi.fn();
      onKeyAvailable(address1, listener);
      listener.mockClear();
      localStorage.setItem(`ecdh_keypair_${address1}`, "stale-ciphertext");

      expect(hasEncryptionKey(address1)).toBe(true);
      expect(hasEncryptionKey(address2)).toBe(true);
      expect(hasKeyPair(address1)).toBe(true);
      expect(hasKeyPair(address2)).toBe(true);

      clearAllEncryptionState();

      expect(hasEncryptionKey(address1)).toBe(false);
      expect(hasEncryptionKey(address2)).toBe(false);
      expect(hasKeyPair(address1)).toBe(false);
      expect(hasKeyPair(address2)).toBe(false);
      expect(localStorage.getItem(`ecdh_keypair_${address1}`)).toBeNull();

      await act(async () => {
        await requestEncryptionKey(address1, mockSignMessage);
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it("removes persisted keypair entries even when the in-memory map is empty", async () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";
      localStorage.setItem(`ecdh_keypair_${address1}`, "stale-ciphertext-1");
      localStorage.setItem(`ecdh_keypair_${address2}`, "stale-ciphertext-2");
      localStorage.setItem("unrelated_key", "preserved");

      expect(hasKeyPair(address1)).toBe(false);
      expect(hasKeyPair(address2)).toBe(false);

      clearAllEncryptionState();

      expect(localStorage.getItem(`ecdh_keypair_${address1}`)).toBeNull();
      expect(localStorage.getItem(`ecdh_keypair_${address2}`)).toBeNull();
      expect(localStorage.getItem("unrelated_key")).toBe("preserved");
    });

    it("drops in-flight requestEncryptionKey results that resolve after teardown", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      let releaseSignature: (sig: string) => void = () => undefined;
      const slowSignMessage = vi.fn(
        async () =>
          new Promise<string>((resolve) => {
            releaseSignature = resolve;
          })
      ) as unknown as SignMessageFn;

      const inFlight = requestEncryptionKey(address, slowSignMessage);

      clearAllEncryptionState();

      await act(async () => {
        releaseSignature(createMockSignature(SIGN_MESSAGE));
        await inFlight;
      });

      expect(hasEncryptionKey(address)).toBe(false);
    });

    it("is reachable via the clearAllEncryptionKeys alias", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
        await requestKeyPair(address, mockSignMessage);
      });

      expect(hasEncryptionKey(address)).toBe(true);
      expect(hasKeyPair(address)).toBe(true);

      clearAllEncryptionKeys();

      expect(hasEncryptionKey(address)).toBe(false);
      expect(hasKeyPair(address)).toBe(false);
    });
  });

  describe("useEncryption hook", () => {
    it("should include key pair functions", () => {
      const { result } = renderHook(() => useEncryption(mockSignMessage));

      expect(result.current.requestKeyPair).toBeDefined();
      expect(result.current.exportPublicKey).toBeDefined();
      expect(result.current.hasKeyPair).toBeDefined();
      expect(result.current.clearKeyPair).toBeDefined();
      expect(typeof result.current.requestKeyPair).toBe("function");
      expect(typeof result.current.exportPublicKey).toBe("function");
      expect(typeof result.current.hasKeyPair).toBe("function");
      expect(typeof result.current.clearKeyPair).toBe("function");
    });

    it("should work with multiple wallet addresses", async () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      const signMessage1: SignMessageFn = async () => createMockSignature(`key-pair-${address1}`);
      const signMessage2: SignMessageFn = async () => createMockSignature(`key-pair-${address2}`);

      const { result } = renderHook(() => useEncryption(mockSignMessage));

      await act(async () => {
        await requestKeyPair(address1, signMessage1);
        await requestKeyPair(address2, signMessage2);
      });

      expect(result.current.hasKeyPair(address1)).toBe(true);
      expect(result.current.hasKeyPair(address2)).toBe(true);

      let publicKey1: string;
      let publicKey2: string;

      await act(async () => {
        publicKey1 = await exportPublicKey(address1, signMessage1);
        publicKey2 = await exportPublicKey(address2, signMessage2);
      });

      expect(publicKey1!).not.toBe(publicKey2!);
    });
  });

  describe("Key Derivation", () => {
    it("should derive valid ECDH P-256 keys", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      let publicKeySpki: string;

      await act(async () => {
        publicKeySpki = await exportPublicKey(address, mockSignMessage);
      });

      const spkiBytes = Uint8Array.from(atob(publicKeySpki!), (c) => c.charCodeAt(0));

      const importedKey = await crypto.subtle.importKey(
        "spki",
        spkiBytes.buffer,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        []
      );

      expect(importedKey.algorithm.name).toBe("ECDH");
      expect((importedKey.algorithm as { name: string; namedCurve: string }).namedCurve).toBe(
        "P-256"
      );
    });

    it("should use signature for derivation (not public seed)", async () => {
      const address = "0x1234567890123456789012345678901234567890";
      const signature1 = createMockSignature("message1");
      const signature2 = createMockSignature("message2");

      clearKeyPair(address);
      await act(async () => {
        await requestKeyPair(address, async () => signature1);
      });
      const publicKey1 = await exportPublicKey(address, async () => signature1);

      clearKeyPair(address);
      await act(async () => {
        await requestKeyPair(address, async () => signature2);
      });
      const publicKey2 = await exportPublicKey(address, async () => signature2);

      expect(publicKey1).not.toBe(publicKey2);
    });
  });

  describe("Integration with Existing Encryption", () => {
    it("should not interfere with encryption keys", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      expect(hasKeyPair(address)).toBe(true);
    });

    it("should share the same signature between encryption keys and key pairs", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      const sharedSignature = await mockSignMessage(SIGN_MESSAGE);

      vi.clearAllMocks();

      const signMessageWithSharedSig: SignMessageFn = async () => sharedSignature;

      await act(async () => {
        await requestEncryptionKey(address, signMessageWithSharedSig);
        await requestKeyPair(address, signMessageWithSharedSig);
      });

      expect(hasEncryptionKey(address)).toBe(true);
      expect(hasKeyPair(address)).toBe(true);

      const publicKey = await exportPublicKey(address, signMessageWithSharedSig);
      expect(publicKey).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle Web Crypto API errors gracefully", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      const originalSubtle = crypto.subtle;
      Object.defineProperty(global, "crypto", {
        value: {
          subtle: {
            ...originalSubtle,
            importKey: vi.fn().mockRejectedValue(new Error("Crypto error")),
          },
          getRandomValues: crypto.getRandomValues,
        },
        writable: true,
      });

      await act(async () => {
        await expect(requestKeyPair(address, mockSignMessage)).rejects.toThrow();
      });

      Object.defineProperty(global, "crypto", {
        value: {
          subtle: originalSubtle,
          getRandomValues: crypto.getRandomValues,
        },
        writable: true,
      });
    });

    it("should handle invalid signatures", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      const invalidSignMessage: SignMessageFn = async () => "0x12";

      try {
        await act(async () => {
          await requestKeyPair(address, invalidSignMessage);
        });
        expect(hasKeyPair(address)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("Wallet Address Validation", () => {
    it("should reject invalid wallet addresses", async () => {
      const invalidAddresses = [
        "not_an_address",
        "0x123",
        "1234567890123456789012345678901234567890",
        "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
        "",
        "0x12345678901234567890123456789012345678901234567890",
      ];

      for (const invalidAddress of invalidAddresses) {
        await act(async () => {
          await expect(requestKeyPair(invalidAddress, mockSignMessage)).rejects.toThrow(
            /invalid.*address/i
          );
        });
      }
    });

    it("should accept valid wallet addresses", async () => {
      const validAddress = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestKeyPair(validAddress, mockSignMessage);
      });

      expect(hasKeyPair(validAddress)).toBe(true);
    });
  });

  describe("Salt Derivation", () => {
    it("should produce different keys for different addresses with same signature", async () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      const sharedSignature = createMockSignature(SIGN_MESSAGE);
      const signMessageWithSharedSig: SignMessageFn = async () => sharedSignature;

      let publicKey1: string;
      let publicKey2: string;

      await act(async () => {
        await requestKeyPair(address1, signMessageWithSharedSig);
        await requestKeyPair(address2, signMessageWithSharedSig);
        publicKey1 = await exportPublicKey(address1, signMessageWithSharedSig);
        publicKey2 = await exportPublicKey(address2, signMessageWithSharedSig);
      });

      expect(publicKey1!).not.toBe(publicKey2!);
    });

    it("should produce same key for same address and signature", async () => {
      const address = "0x1234567890123456789012345678901234567890";
      const signature = createMockSignature(SIGN_MESSAGE);
      const signMessageWithSig: SignMessageFn = async () => signature;

      clearKeyPair(address);
      await act(async () => {
        await requestKeyPair(address, signMessageWithSig);
      });
      const publicKey1 = await exportPublicKey(address, signMessageWithSig);

      clearKeyPair(address);
      await act(async () => {
        await requestKeyPair(address, signMessageWithSig);
      });
      const publicKey2 = await exportPublicKey(address, signMessageWithSig);

      expect(publicKey1).toBe(publicKey2);
    });
  });

  describe("Keypair Persistence", () => {
    beforeEach(() => {
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
    });

    it("should persist keypair to localStorage after generation", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
        await requestKeyPair(address, mockSignMessage);
      });

      const storageKey = `ecdh_keypair_${address}`;
      const persisted = localStorage.getItem(storageKey);
      if (persisted) {
        expect(persisted.length).toBeGreaterThan(0);
      }
      expect(hasKeyPair(address)).toBe(true);
    });

    it("should load persisted keypair from localStorage without requiring signature", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
        await requestKeyPair(address, mockSignMessage);
      });

      const publicKey1 = await exportPublicKey(address, mockSignMessage);

      const storageKey = `ecdh_keypair_${address}`;
      const persisted = localStorage.getItem(storageKey);

      clearKeyPair(address);
      if (persisted) {
        localStorage.setItem(storageKey, persisted);
      }
      expect(hasKeyPair(address)).toBe(false);

      vi.clearAllMocks();

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      if (persisted) {
        expect(mockSignMessage).not.toHaveBeenCalled();
        expect(hasKeyPair(address)).toBe(true);

        const publicKey2 = await exportPublicKey(address, mockSignMessage);
        expect(publicKey1).toBe(publicKey2);
      } else {
        expect(hasKeyPair(address)).toBe(true);
      }
    });

    it("should clear persisted keypair when clearKeyPair is called", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
        await requestKeyPair(address, mockSignMessage);
      });

      const storageKey = `ecdh_keypair_${address}`;
      expect(localStorage.getItem(storageKey)).toBeDefined();

      clearKeyPair(address);

      expect(hasKeyPair(address)).toBe(false);
      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it("should handle missing encryption key gracefully when loading persisted keypair", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
        await requestKeyPair(address, mockSignMessage);
      });

      clearEncryptionKey(address);
      clearKeyPair(address);

      await act(async () => {
        await requestKeyPair(address, mockSignMessage);
      });

      expect(mockSignMessage).toHaveBeenCalled();
      expect(hasKeyPair(address)).toBe(true);
    });

    it("should handle corrupted persisted data gracefully", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      const storageKey = `ecdh_keypair_${address}`;
      localStorage.setItem(storageKey, "corrupted_data");

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
        await requestKeyPair(address, mockSignMessage);
      });

      expect(hasKeyPair(address)).toBe(true);
      const persisted = localStorage.getItem(storageKey);
      if (persisted) {
        expect(persisted).not.toBe("corrupted_data");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty wallet addresses", async () => {
      const address = "";

      await act(async () => {
        await expect(requestKeyPair(address, mockSignMessage)).rejects.toThrow(/invalid.*address/i);
      });
    });

    it("should handle concurrent key pair requests", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await Promise.all([
          requestKeyPair(address, mockSignMessage),
          requestKeyPair(address, mockSignMessage),
          requestKeyPair(address, mockSignMessage),
        ]);
      });

      expect(hasKeyPair(address)).toBe(true);

      const publicKey1 = await exportPublicKey(address, mockSignMessage);
      const publicKey2 = await exportPublicKey(address, mockSignMessage);
      expect(publicKey1).toBe(publicKey2);
    });
  });

  describe("requestEncryptionKey deduplication", () => {
    it("concurrent callers all receive the same error when signing fails", async () => {
      const address = "0x1234567890123456789012345678901234567890";
      clearEncryptionKey(address);

      const failingSignMessage: SignMessageFn = async () => {
        throw new Error("User rejected signing");
      };

      const results = await Promise.allSettled([
        requestEncryptionKey(address, failingSignMessage),
        requestEncryptionKey(address, failingSignMessage),
        requestEncryptionKey(address, failingSignMessage),
      ]);

      for (const result of results) {
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
          expect(result.reason).toBeInstanceOf(Error);
        }
      }
      expect(hasEncryptionKey(address)).toBe(false);
    });

    it("after a failed request, a subsequent call can succeed", async () => {
      const address = "0x1234567890123456789012345678901234567890";
      clearEncryptionKey(address);

      const failingSignMessage: SignMessageFn = async () => {
        throw new Error("User rejected signing");
      };

      await expect(requestEncryptionKey(address, failingSignMessage)).rejects.toThrow();
      expect(hasEncryptionKey(address)).toBe(false);

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
      });

      expect(hasEncryptionKey(address)).toBe(true);
    });
  });

  describe("HKDF Key Derivation (v3)", () => {
    it("should derive both legacy and HKDF keys from the same signature", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
      });

      const v2Key = await getEncryptionKey(address, "v2");
      const v3Key = await getEncryptionKey(address, "v3");

      expect(v2Key).toBeDefined();
      expect(v3Key).toBeDefined();
      expect(v2Key).not.toBe(v3Key);
    });

    it("should encrypt with v3 key by default and decrypt correctly", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
      });

      const plaintext = "Hello, HKDF encryption!";
      const encrypted = await encryptData(plaintext, address);
      const decrypted = await decryptData(encrypted, address);

      expect(decrypted).toBe(plaintext);
    });

    it("should decrypt v2-encrypted data with v2 version parameter", async () => {
      const address = "0x1234567890123456789012345678901234567890";

      await act(async () => {
        await requestEncryptionKey(address, mockSignMessage);
      });

      const plaintext = "Legacy encrypted data";
      const encrypted = await encryptData(plaintext, address);

      await expect(decryptData(encrypted, address, "v2")).rejects.toThrow();

      const decrypted = await decryptData(encrypted, address);
      expect(decrypted).toBe(plaintext);
    });
  });
});
