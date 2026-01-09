# UseICloudBackupResult

Defined in: [src/react/useICloudBackup.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L43)

Result returned by useICloudBackup hook

## Properties

### backup()

> **backup**: (`options?`: `object`) => `Promise`<[`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useICloudBackup.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L45)

Backup all conversations to iCloud

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; } |
| `options.onProgress?` | (`current`: `number`, `total`: `number`) => `void` |

**Returns**

`Promise`<[`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useICloudBackup.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L55)

Whether user has signed in to iCloud

***

### isAvailable

> **isAvailable**: `boolean`

Defined in: [src/react/useICloudBackup.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L57)

Whether CloudKit JS is available

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useICloudBackup.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L53)

Whether iCloud is configured

***

### restore()

> **restore**: (`options?`: `object`) => `Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useICloudBackup.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L49)

Restore conversations from iCloud

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; } |
| `options.onProgress?` | (`current`: `number`, `total`: `number`) => `void` |

**Returns**

`Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>
