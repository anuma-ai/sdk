# ProviderBackupState

Defined in: [src/react/useBackup.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L80)

Provider-specific backup state

## Properties

### backup()

> **backup**: (`options?`) => `Promise`\<[`DropboxExportResult`](DropboxExportResult.md) \| [`GoogleDriveExportResult`](GoogleDriveExportResult.md) \| [`ICloudExportResult`](ICloudExportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useBackup.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L86)

Backup all conversations to this provider

#### Parameters

##### options?

[`BackupOperationOptions`](BackupOperationOptions.md)

#### Returns

`Promise`\<[`DropboxExportResult`](DropboxExportResult.md) \| [`GoogleDriveExportResult`](GoogleDriveExportResult.md) \| [`ICloudExportResult`](ICloudExportResult.md) \| \{ `error`: `string`; \}\>

***

### connect()

> **connect**: () => `Promise`\<`string`\>

Defined in: [src/react/useBackup.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L94)

Request access to this provider (triggers OAuth if needed)

#### Returns

`Promise`\<`string`\>

***

### disconnect()

> **disconnect**: () => `Promise`\<`void`\>

Defined in: [src/react/useBackup.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L96)

Disconnect from this provider

#### Returns

`Promise`\<`void`\>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackup.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L84)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackup.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L82)

Whether the provider is configured

***

### restore()

> **restore**: (`options?`) => `Promise`\<[`DropboxImportResult`](DropboxImportResult.md) \| [`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| [`ICloudImportResult`](ICloudImportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useBackup.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L90)

Restore conversations from this provider

#### Parameters

##### options?

[`BackupOperationOptions`](BackupOperationOptions.md)

#### Returns

`Promise`\<[`DropboxImportResult`](DropboxImportResult.md) \| [`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| [`ICloudImportResult`](ICloudImportResult.md) \| \{ `error`: `string`; \}\>
