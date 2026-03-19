# BlobUrlManager

Defined in: [src/lib/storage/opfs.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/opfs.ts#311)

Manager for blob URLs to prevent memory leaks.
Tracks active blob URLs and provides cleanup functionality.

## Constructors

### Constructor

> **new BlobUrlManager**(): `BlobUrlManager`

**Returns**

`BlobUrlManager`

## Accessors

### size

**Get Signature**

> **get** **size**(): `number`

Defined in: [src/lib/storage/opfs.ts:357](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/opfs.ts#357)

Gets the count of active blob URLs.

**Returns**

`number`

## Methods

### createUrl()

> **createUrl**(`fileId`: `string`, `blob`: `Blob`): `string`

Defined in: [src/lib/storage/opfs.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/opfs.ts#317)

Creates a blob URL for a file and tracks it.

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

`fileId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`blob`

</td>
<td>

`Blob`

</td>
</tr>
</tbody>
</table>

**Returns**

`string`

***

### getUrl()

> **getUrl**(`fileId`: `string`): `string` | `undefined`

Defined in: [src/lib/storage/opfs.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/opfs.ts#329)

Gets the active blob URL for a file, if any.

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

`fileId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`string` | `undefined`

***

### revokeAll()

> **revokeAll**(): `void`

Defined in: [src/lib/storage/opfs.ts:347](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/opfs.ts#347)

Revokes all tracked blob URLs.

**Returns**

`void`

***

### revokeUrl()

> **revokeUrl**(`fileId`: `string`): `void`

Defined in: [src/lib/storage/opfs.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/opfs.ts#336)

Revokes a blob URL and removes it from tracking.

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

`fileId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
