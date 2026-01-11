# ProviderBackupState

Defined in: [src/react/useBackup.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L81)

Provider-specific backup state

## Properties

### backup()

> **backup**: (`options?`: [`BackupOperationOptions`](BackupOperationOptions.md)) => `Promise`<[`DropboxExportResult`](DropboxExportResult.md) | [`GoogleDriveExportResult`](GoogleDriveExportResult.md) | [`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useBackup.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L87)

Backup all conversations to this provider

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

[`BackupOperationOptions`](BackupOperationOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`DropboxExportResult`](DropboxExportResult.md) | [`GoogleDriveExportResult`](GoogleDriveExportResult.md) | [`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

***

### connect()

> **connect**: () => `Promise`<`string`>

Defined in: [src/react/useBackup.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L95)

Request access to this provider (triggers OAuth if needed)

**Returns**

`Promise`<`string`>

***

### disconnect()

> **disconnect**: () => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L97)

Disconnect from this provider

**Returns**

`Promise`<`void`>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackup.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L85)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackup.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L83)

Whether the provider is configured

***

### restore()

> **restore**: (`options?`: [`BackupOperationOptions`](BackupOperationOptions.md)) => `Promise`<[`DropboxImportResult`](DropboxImportResult.md) | [`GoogleDriveImportResult`](GoogleDriveImportResult.md) | [`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useBackup.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L91)

Restore conversations from this provider

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

[`BackupOperationOptions`](BackupOperationOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`DropboxImportResult`](DropboxImportResult.md) | [`GoogleDriveImportResult`](GoogleDriveImportResult.md) | [`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>
