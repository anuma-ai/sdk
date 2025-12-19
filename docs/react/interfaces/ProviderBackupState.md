# ProviderBackupState

Defined in: [src/react/useBackup.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L72)

Provider-specific backup state

## Properties

### backup()

> **backup**: (`options?`) => `Promise`\<[`DropboxExportResult`](DropboxExportResult.md) \| [`GoogleDriveExportResult`](GoogleDriveExportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useBackup.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L78)

Backup all conversations to this provider

#### Parameters

##### options?

[`BackupOperationOptions`](BackupOperationOptions.md)

#### Returns

`Promise`\<[`DropboxExportResult`](DropboxExportResult.md) \| [`GoogleDriveExportResult`](GoogleDriveExportResult.md) \| \{ `error`: `string`; \}\>

***

### connect()

> **connect**: () => `Promise`\<`string`\>

Defined in: [src/react/useBackup.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L86)

Request access to this provider (triggers OAuth if needed)

#### Returns

`Promise`\<`string`\>

***

### disconnect()

> **disconnect**: () => `Promise`\<`void`\>

Defined in: [src/react/useBackup.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L88)

Disconnect from this provider

#### Returns

`Promise`\<`void`\>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackup.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L76)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackup.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L74)

Whether the provider is configured

***

### restore()

> **restore**: (`options?`) => `Promise`\<[`DropboxImportResult`](DropboxImportResult.md) \| [`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useBackup.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L82)

Restore conversations from this provider

#### Parameters

##### options?

[`BackupOperationOptions`](BackupOperationOptions.md)

#### Returns

`Promise`\<[`DropboxImportResult`](DropboxImportResult.md) \| [`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| \{ `error`: `string`; \}\>
