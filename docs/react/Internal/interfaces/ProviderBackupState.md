# ProviderBackupState

Defined in: [src/react/useBackup.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#52)

Provider-specific backup state

## Properties

### backup()

> **backup**: (`options?`: [`BackupOperationOptions`](BackupOperationOptions.md)) => `Promise`<[`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useBackup.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#58)

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

`Promise`<[`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

***

### connect()

> **connect**: () => `Promise`<`string`>

Defined in: [src/react/useBackup.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#62)

Request access to this provider (triggers iCloud sign-in if needed)

**Returns**

`Promise`<`string`>

***

### disconnect()

> **disconnect**: () => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#64)

Disconnect from this provider

**Returns**

`Promise`<`void`>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackup.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#56)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackup.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#54)

Whether the provider is configured

***

### restore()

> **restore**: (`options?`: [`BackupOperationOptions`](BackupOperationOptions.md)) => `Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useBackup.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#60)

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

`Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>
