# BackupAuthContextValue

Defined in: [src/react/useBackupAuth.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#60)

Context value for unified backup authentication

## Properties

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackupAuth.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#66)

Check if any provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackupAuth.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#64)

Check if any provider is configured

***

### icloud

> **icloud**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#62)

iCloud authentication state and methods

***

### logoutAll()

> **logoutAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#68)

Logout from all providers

**Returns**

`Promise`<`void`>
