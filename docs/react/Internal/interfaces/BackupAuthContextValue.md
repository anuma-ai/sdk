# BackupAuthContextValue

Defined in: [src/react/useBackupAuth.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#101)

Context value for unified backup authentication

## Properties

### dropbox

> **dropbox**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#103)

Dropbox authentication state and methods

***

### googleDrive

> **googleDrive**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#105)

Google Drive authentication state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackupAuth.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#111)

Check if any provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackupAuth.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#109)

Check if any provider is configured

***

### icloud

> **icloud**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#107)

iCloud authentication state and methods

***

### logoutAll()

> **logoutAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#113)

Logout from all providers

**Returns**

`Promise`<`void`>
