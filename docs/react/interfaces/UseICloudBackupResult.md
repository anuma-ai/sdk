# UseICloudBackupResult

Defined in: [src/react/useICloudBackup.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L42)

Result returned by useICloudBackup hook

## Properties

### backup()

> **backup**: (`options?`: { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }) => `Promise`<[`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useICloudBackup.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L44)

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

Defined in: [src/react/useICloudBackup.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L54)

Whether user has signed in to iCloud

***

### isAvailable

> **isAvailable**: `boolean`

Defined in: [src/react/useICloudBackup.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L56)

Whether CloudKit JS is available

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useICloudBackup.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L52)

Whether iCloud is configured

***

### restore()

> **restore**: (`options?`: { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }) => `Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useICloudBackup.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L48)

Restore conversations from iCloud

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | { `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; } |
| `options.onProgress?` | (`current`: `number`, `total`: `number`) => `void` |

**Returns**

`Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>
