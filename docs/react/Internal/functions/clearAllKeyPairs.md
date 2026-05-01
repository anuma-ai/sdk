# clearAllKeyPairs

> **clearAllKeyPairs**(): `void`

Defined in: [src/react/useEncryption.ts:1232](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1232)

Clears all key pairs from memory and any persisted entries in localStorage.

Matches the persistence behavior of the per-address [clearKeyPair](clearKeyPair.md);
without this, `clearAllKeyPairs()` would leave `ecdh_keypair_*` ciphertext
behind in storage while `clearKeyPair(address)` removes it.

## Returns

`void`
