# UseGoogleDriveBackupResult

Defined in: [src/react/useGoogleDriveBackup.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L45)

Result returned by useGoogleDriveBackup hook

## Properties

### backup()

> **backup**: (`options?`: `object`) => `Promise`<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useGoogleDriveBackup.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L47)

Backup all conversations to Google Drive

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

`Promise`<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) | { `error`: `string`; }>

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useGoogleDriveBackup.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L57)

Whether user has a Google Drive token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useGoogleDriveBackup.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L55)

Whether Google Drive is configured

***

### restore()

> **restore**: (`options?`: `object`) => `Promise`<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useGoogleDriveBackup.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L51)

Restore conversations from Google Drive

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

`Promise`<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) | { `error`: `string`; }>
