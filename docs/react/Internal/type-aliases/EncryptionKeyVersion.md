# EncryptionKeyVersion

> **EncryptionKeyVersion** = `"v2"` | `"v3"`

Defined in: [src/react/useEncryption.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#12)

Encryption key version type.

* "v2": Legacy SHA-256 derived key (for reading enc:v2: data)
* "v3": HKDF derived key with domain separation (for new encryption)
