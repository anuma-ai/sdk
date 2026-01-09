# UseDropboxBackupResult

Defined in: [src/react/useDropboxBackup.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L45)

Result returned by useDropboxBackup hook

## Properties

### backup()

> **backup**: (`options?`: { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }) => `Promise`<[`DropboxExportResult`](DropboxExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useDropboxBackup.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L47)

Backup all conversations to Dropbox

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; } |
| `options.onProgress?` | (`current`: `number`, `total`: `number`) => `void` |

**Returns**

`Promise`<[`DropboxExportResult`](DropboxExportResult.md) | { `error`: `string`; }>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useDropboxBackup.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L57)

Whether user has a Dropbox token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxBackup.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L55)

Whether Dropbox is configured

***

### restore()

> **restore**: (`options?`: { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }) => `Promise`<[`DropboxImportResult`](DropboxImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useDropboxBackup.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L51)

Restore conversations from Dropbox

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; } |
| `options.onProgress?` | (`current`: `number`, `total`: `number`) => `void` |

**Returns**

`Promise`<[`DropboxImportResult`](DropboxImportResult.md) | { `error`: `string`; }>
