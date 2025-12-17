# UseDropboxBackupResult

Defined in: [src/react/useDropboxBackup.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L44)

Result returned by useDropboxBackup hook

## Properties

### backup()

> **backup**: (`options?`) => `Promise`\<[`DropboxExportResult`](DropboxExportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useDropboxBackup.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L46)

Backup all conversations to Dropbox

#### Parameters

##### options?

###### onProgress?

(`current`, `total`) => `void`

#### Returns

`Promise`\<[`DropboxExportResult`](DropboxExportResult.md) \| \{ `error`: `string`; \}\>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useDropboxBackup.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L56)

Whether user has a Dropbox token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxBackup.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L54)

Whether Dropbox is configured

***

### restore()

> **restore**: (`options?`) => `Promise`\<[`DropboxImportResult`](DropboxImportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useDropboxBackup.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L50)

Restore conversations from Dropbox

#### Parameters

##### options?

###### onProgress?

(`current`, `total`) => `void`

#### Returns

`Promise`\<[`DropboxImportResult`](DropboxImportResult.md) \| \{ `error`: `string`; \}\>
