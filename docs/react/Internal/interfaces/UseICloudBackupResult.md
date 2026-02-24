# UseICloudBackupResult

Defined in: [src/react/useICloudBackup.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#40)

Result returned by useICloudBackup hook

## Properties

### backup()

> **backup**: (`options?`: `object`) => `Promise`<[`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useICloudBackup.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#42)

Backup all conversations to iCloud

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

`object`

</td>
</tr>
<tr>
<td>

`options.onProgress?`

</td>
<td>

(`current`: `number`, `total`: `number`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ICloudExportResult`](ICloudExportResult.md) | { `error`: `string`; }>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useICloudBackup.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#52)

Whether user has signed in to iCloud

***

### isAvailable

> **isAvailable**: `boolean`

Defined in: [src/react/useICloudBackup.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#54)

Whether CloudKit JS is available

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useICloudBackup.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#50)

Whether iCloud is configured

***

### restore()

> **restore**: (`options?`: `object`) => `Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useICloudBackup.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudBackup.ts#46)

Restore conversations from iCloud

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

`object`

</td>
</tr>
<tr>
<td>

`options.onProgress?`

</td>
<td>

(`current`: `number`, `total`: `number`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ICloudImportResult`](ICloudImportResult.md) | { `error`: `string`; }>
