# ~~clearAllEncryptionKeys()~~

> **clearAllEncryptionKeys**(): `void`

Defined in: [src/react/useEncryption.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#195)

Clears all encryption keys from memory.

## Returns

`void`

## Deprecated

Use [clearAllEncryptionState](clearAllEncryptionState.md) instead. This function is kept
as an alias for backwards compatibility and now delegates to the canonical
teardown, which additionally clears `keyAvailableCallbacks`, pending key
requests, and derived ECDH key pairs (both in-memory and persisted).
