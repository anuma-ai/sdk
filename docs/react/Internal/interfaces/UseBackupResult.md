# UseBackupResult

Defined in: [src/react/useBackup.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L103)

Result returned by useBackup hook

## Properties

### disconnectAll()

> **disconnectAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L115)

Disconnect from all providers

**Returns**

`Promise`<`void`>

***

### dropbox

> **dropbox**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L105)

Dropbox backup state and methods

***

### googleDrive

> **googleDrive**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L107)

Google Drive backup state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackup.ts:113](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L113)

Whether any backup provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackup.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L111)

Whether any backup provider is configured

***

### icloud

> **icloud**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L109)

iCloud backup state and methods
