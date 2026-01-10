# BackupAuthContextValue

Defined in: src/react/useBackupAuth.ts:100

Context value for unified backup authentication

## Properties

### dropbox

> **dropbox**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: src/react/useBackupAuth.ts:102

Dropbox authentication state and methods

***

### googleDrive

> **googleDrive**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: src/react/useBackupAuth.ts:104

Google Drive authentication state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: src/react/useBackupAuth.ts:110

Check if any provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: src/react/useBackupAuth.ts:108

Check if any provider is configured

***

### icloud

> **icloud**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: src/react/useBackupAuth.ts:106

iCloud authentication state and methods

***

### logoutAll()

> **logoutAll**: () => `Promise`<`void`>

Defined in: src/react/useBackupAuth.ts:112

Logout from all providers

**Returns**

`Promise`<`void`>
