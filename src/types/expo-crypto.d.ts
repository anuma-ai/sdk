/**
 * Type declarations for expo-crypto (optional peer dependency).
 * These types are only used when expo-crypto is dynamically imported in React Native environments.
 */

declare module "expo-crypto" {
  export enum CryptoDigestAlgorithm {
    SHA1 = "SHA-1",
    SHA256 = "SHA-256",
    SHA384 = "SHA-384",
    SHA512 = "SHA-512",
    MD2 = "MD2",
    MD4 = "MD4",
    MD5 = "MD5",
  }

  export function digest(
    algorithm: CryptoDigestAlgorithm,
    data: BufferSource
  ): Promise<ArrayBuffer>;

  export function digestStringAsync(
    algorithm: CryptoDigestAlgorithm,
    data: string,
    options?: { encoding?: "hex" | "base64" }
  ): Promise<string>;
}
