# UseGoogleDriveBackupResult

Defined in: [src/react/useGoogleDriveBackup.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L50)

Result returned by useGoogleDriveBackup hook

## Properties

### backup()

> **backup**: (`options?`) => `Promise`\<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useGoogleDriveBackup.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L52)

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

Defined in: [src/react/useGoogleDriveBackup.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L60)

Whether user has a Google Drive token

***

### restore()

> **restore**: (`options?`) => `Promise`\<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| \{ `error`: `string`; \}\>

Defined in: [src/react/useGoogleDriveBackup.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L56)

Restore conversations from Google Drive

#### Parameters

##### options?

###### onProgress?

(`current`, `total`) => `void`

#### Returns

`Promise`\<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) \| \{ `error`: `string`; \}\>
