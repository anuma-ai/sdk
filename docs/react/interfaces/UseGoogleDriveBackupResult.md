# UseGoogleDriveBackupResult

Defined in: [src/react/useGoogleDriveBackup.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L47)

Result returned by useGoogleDriveBackup hook

## Properties

### backup()

> **backup**: (`options?`) => `Promise`\<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useGoogleDriveBackup.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L49)

Backup all conversations to Google Drive

#### Parameters

##### options?

###### onProgress?

(`current`, `total`) => `void`

#### Returns

`Promise`\<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) \| \{ `error`: `string`; \}\>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useGoogleDriveBackup.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L59)

Whether user has a Google Drive token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useGoogleDriveBackup.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L57)

Whether Google Drive is configured

***

### restore()

> **restore**: (`options?`) => `Promise`\<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useGoogleDriveBackup.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L53)

Restore conversations from Google Drive

#### Parameters

##### options?

###### onProgress?

(`current`, `total`) => `void`

#### Returns

`Promise`\<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| \{ `error`: `string`; \}\>
