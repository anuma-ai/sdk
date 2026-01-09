# UseBackupResult

Defined in: [src/react/useBackup.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L102)

Result returned by useBackup hook

## Properties

### disconnectAll()

> **disconnectAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:114](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L114)

Disconnect from all providers

**Returns**

`Promise`<`void`>

***

### dropbox

> **dropbox**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L104)

Dropbox backup state and methods

***

### googleDrive

> **googleDrive**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L106)

Google Drive backup state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackup.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L112)

Whether any backup provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackup.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L110)

Whether any backup provider is configured

***

### icloud

> **icloud**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L108)

iCloud backup state and methods
