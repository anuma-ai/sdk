# BlobUrlManager

Defined in: [src/lib/storage/opfs.ts:262](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L262)

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

Defined in: [src/lib/storage/opfs.ts:308](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L308)

Gets the count of active blob URLs.

**Returns**

`number`

## Methods

### createUrl()

> **createUrl**(`fileId`: `string`, `blob`: `Blob`): `string`

Defined in: [src/lib/storage/opfs.ts:268](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L268)

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

Defined in: [src/lib/storage/opfs.ts:280](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L280)

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

Defined in: [src/lib/storage/opfs.ts:298](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L298)

Revokes all tracked blob URLs.

**Returns**

`void`

***

### revokeUrl()

> **revokeUrl**(`fileId`: `string`): `void`

Defined in: [src/lib/storage/opfs.ts:287](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L287)

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
