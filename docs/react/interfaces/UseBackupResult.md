# UseBackupResult

Defined in: [src/react/useBackup.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L94)

Result returned by useBackup hook

## Properties

### disconnectAll()

> **disconnectAll**: () => `Promise`\<`void`\>

Defined in: [src/react/useBackup.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L104)

Disconnect from all providers

#### Returns

`Promise`\<`void`\>

***

### dropbox

> **dropbox**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L96)

Dropbox backup state and methods

***

### googleDrive

> **googleDrive**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L98)

Google Drive backup state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackup.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L102)

Whether any backup provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackup.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L100)

Whether any backup provider is configured
