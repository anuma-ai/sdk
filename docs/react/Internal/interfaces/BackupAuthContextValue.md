# BackupAuthContextValue

Defined in: [src/react/useBackupAuth.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#L100)

Context value for unified backup authentication

## Properties

### dropbox

> **dropbox**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#L102)

Dropbox authentication state and methods

***

### googleDrive

> **googleDrive**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#L104)

Google Drive authentication state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackupAuth.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#L110)

Check if any provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackupAuth.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#L108)

Check if any provider is configured

***

### icloud

> **icloud**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#L106)

iCloud authentication state and methods

***

### logoutAll()

> **logoutAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#L112)

Logout from all providers

**Returns**

`Promise`<`void`>
