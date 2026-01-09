# UseGoogleDriveBackupResult

Defined in: [src/react/useGoogleDriveBackup.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L48)

Result returned by useGoogleDriveBackup hook

## Properties

### backup()

> **backup**: (`options?`: { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }) => `Promise`<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useGoogleDriveBackup.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L50)

Backup all conversations to Google Drive

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; } |
| `options.onProgress?` | (`current`: `number`, `total`: `number`) => `void` |

**Returns**

`Promise`<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) | { `error`: `string`; }>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useGoogleDriveBackup.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L60)

Whether user has a Google Drive token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useGoogleDriveBackup.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L58)

Whether Google Drive is configured

***

### restore()

> **restore**: (`options?`: { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }) => `Promise`<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useGoogleDriveBackup.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L54)

Restore conversations from Google Drive

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; } |
| `options.onProgress?` | (`current`: `number`, `total`: `number`) => `void` |

**Returns**

`Promise`<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) | { `error`: `string`; }>
