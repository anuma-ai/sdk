# BackupAuthContextValue

Defined in: [src/react/useBackupAuth.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#61)

Context value for unified backup authentication

## Properties

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackupAuth.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#67)

Check if any provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackupAuth.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#65)

Check if any provider is configured

***

### icloud

> **icloud**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#63)

iCloud authentication state and methods

***

### logoutAll()

> **logoutAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#69)

Logout from all providers

**Returns**

`Promise`<`void`>
