# UseGoogleDriveBackupResult

Defined in: [src/react/useGoogleDriveBackup.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L48)

Result returned by useGoogleDriveBackup hook

## Properties

### backup()

> **backup**: (`options?`: `object`) => `Promise`<[`GoogleDriveExportResult`](GoogleDriveExportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useGoogleDriveBackup.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L50)

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

{ `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }

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

Defined in: [src/react/useGoogleDriveBackup.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L60)

Whether user has a Google Drive token

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useGoogleDriveBackup.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L58)

Whether Google Drive is configured

***

### restore()

> **restore**: (`options?`: `object`) => `Promise`<[`GoogleDriveImportResult`](GoogleDriveImportResult.md) | { `error`: `string`; }>

Defined in: [src/react/useGoogleDriveBackup.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L54)

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

{ `onProgress?`: (`current`: `number`, `total`: `number`) => `void`; }

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
