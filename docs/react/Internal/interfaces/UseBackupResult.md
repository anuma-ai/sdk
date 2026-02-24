# UseBackupResult

Defined in: [src/react/useBackup.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#104)

Result returned by useBackup hook

## Properties

### disconnectAll()

> **disconnectAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#116)

Disconnect from all providers

**Returns**

`Promise`<`void`>

***

### dropbox

> **dropbox**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#106)

Dropbox backup state and methods

***

### googleDrive

> **googleDrive**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#108)

Google Drive backup state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackup.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#114)

Whether any backup provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackup.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#112)

Whether any backup provider is configured

***

### icloud

> **icloud**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#110)

iCloud backup state and methods
