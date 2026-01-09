# UseDropboxBackupResult

Defined in: [src/react/useDropboxBackup.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L45)

Result returned by useDropboxBackup hook

## Properties

### backup()

> **backup**: (`options?`: `object`) => `Promise`<[`DropboxExportResult`](DropboxExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useDropboxBackup.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L47)

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

Defined in: [src/react/useDropboxBackup.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L57)

Whether user has a Dropbox token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxBackup.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L55)

Whether Dropbox is configured

***

### restore()

> **restore**: (`options?`: `object`) => `Promise`<[`DropboxImportResult`](DropboxImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useDropboxBackup.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L51)

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
