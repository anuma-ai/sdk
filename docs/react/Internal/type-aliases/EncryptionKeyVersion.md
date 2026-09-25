# EncryptionKeyVersion

> **EncryptionKeyVersion** = `"v2"` | `"v3"`

Defined in: [src/react/useEncryption.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#16)

Encryption key version type.

* "v2": Legacy SHA-256 derived key (for reading enc:v2: data)
* "v3": HKDF derived key with domain separation (for new encryption)

Raw signature bytes (Privy Solana `signMessage` returns a `Uint8Array`) are
not a stored version. Derive them with [deriveKeyFromSignatureBytes](../../Encryption/deriveKeyFromSignatureBytes.md).
[requestEncryptionKey](../functions/requestEncryptionKey.md) still derives v2 and v3 from a hex signature only.
