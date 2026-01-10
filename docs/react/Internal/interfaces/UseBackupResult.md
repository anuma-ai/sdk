# UseBackupResult

Defined in: src/react/useBackup.ts:103

Result returned by useBackup hook

## Properties

### disconnectAll()

> **disconnectAll**: () => `Promise`<`void`>

Defined in: src/react/useBackup.ts:115

Disconnect from all providers

**Returns**

`Promise`<`void`>

***

### dropbox

> **dropbox**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: src/react/useBackup.ts:105

Dropbox backup state and methods

***

### googleDrive

> **googleDrive**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: src/react/useBackup.ts:107

Google Drive backup state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: src/react/useBackup.ts:113

Whether any backup provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: src/react/useBackup.ts:111

Whether any backup provider is configured

***

### icloud

> **icloud**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: src/react/useBackup.ts:109

iCloud backup state and methods
