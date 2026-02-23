# ProviderBackupState

Defined in: [src/react/useBackup.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L78)

Provider-specific backup state

## Properties

### backup()

> **backup**: (`options?`: [`BackupOperationOptions`](BackupOperationOptions.md)) => `Promise`<[`DropboxExportResult`](DropboxExportResult.md) | [`GoogleDriveExportResult`](GoogleDriveExportResult.md) | [`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useBackup.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L84)

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

Defined in: [src/react/useBackup.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L96)

Request access to this provider (triggers OAuth if needed)

**Returns**

`Promise`<`string`>

***

### disconnect()

> **disconnect**: () => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L98)

Disconnect from this provider

**Returns**

`Promise`<`void`>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackup.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L82)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackup.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L80)

Whether the provider is configured

***

### restore()

> **restore**: (`options?`: [`BackupOperationOptions`](BackupOperationOptions.md)) => `Promise`<[`DropboxImportResult`](DropboxImportResult.md) | [`GoogleDriveImportResult`](GoogleDriveImportResult.md) | [`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useBackup.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L90)

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
