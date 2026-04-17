# clearAllEncryptionState

> **clearAllEncryptionState**(): `void`

Defined in: [src/react/useEncryption.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#165)

Clears all encryption-related state from memory and any derived persistence.

This is the canonical session-teardown entry point. It wipes every module-level
map that retains key material or listeners tied to a session: the raw
encryption keys, cached imported CryptoKey objects, availability callbacks,
pending sign-in flights, and derived ECDH key pairs. It also removes any
persisted ECDH key pairs from localStorage so they can't be decrypted by a
subsequent user on a shared browser.

Call this on logout / session-end to prevent cross-user key leakage on shared
browsers. If you manage auth outside the SDK, wire this into your logout flow.

## Returns

`void`

## Example

```tsx
import { clearAllEncryptionState } from "@anuma/sdk/react";

async function handleLogout() {
  clearAllEncryptionState();
  await privy.logout();
}
```
