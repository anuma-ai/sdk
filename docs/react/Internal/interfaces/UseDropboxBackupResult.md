# UseDropboxBackupResult

Defined in: [src/react/useDropboxBackup.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L42)

Result returned by useDropboxBackup hook

## Properties

### backup()

> **backup**: (`options?`: `object`) => `Promise`<[`DropboxExportResult`](DropboxExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useDropboxBackup.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L44)

Backup all conversations to Dropbox

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

`Promise`<[`DropboxExportResult`](DropboxExportResult.md) | { `error`: `string`; }>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useDropboxBackup.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L54)

Whether user has a Dropbox token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxBackup.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L52)

Whether Dropbox is configured

***

### restore()

> **restore**: (`options?`: `object`) => `Promise`<[`DropboxImportResult`](DropboxImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useDropboxBackup.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L48)

Restore conversations from Dropbox

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

`Promise`<[`DropboxImportResult`](DropboxImportResult.md) | { `error`: `string`; }>
