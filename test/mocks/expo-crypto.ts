/**
 * Mock for expo-crypto in test environments.
 * Tests run in happy-dom which provides crypto.subtle, so this mock
 * should never actually be called. It's here to satisfy Vite's import resolution.
 */

export enum CryptoDigestAlgorithm {
  SHA256 = "SHA-256",
  SHA512 = "SHA-512",
}

export async function digest(
  algorithm: CryptoDigestAlgorithm,
  data: Uint8Array
): Promise<ArrayBuffer> {
  // In test environment, crypto.subtle should be available via happy-dom
  // This is just a fallback that should never be reached
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return await crypto.subtle.digest(algorithm, data);
  }
  throw new Error("expo-crypto mock: crypto.subtle not available");
}
