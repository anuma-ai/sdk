# VaultMediaLibrary

Defined in: [src/lib/chatStore/media.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#53)

The account's library files in vault: list, store, read and delete them on any device.

## Properties

### enabled

> `readonly` **enabled**: `boolean`

Defined in: [src/lib/chatStore/media.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#55)

False when vault does not store media: `list` is empty, `read` null, `delete` false and `create` rejects with `media_unsupported`.

## Methods

### close()

> **close**(): `void`

Defined in: [src/lib/chatStore/media.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#69)

**Returns**

`void`

***

### create()

> **create**(`item`: [`MediaItemInput`](MediaItemInput.md), `bytes`: `Blob` | `Uint8Array`<`ArrayBufferLike`> | [`VaultAttachmentSource`](VaultAttachmentSource.md), `signal?`: `AbortSignal`): `Promise`<[`MediaItem`](MediaItem.md)>

Defined in: [src/lib/chatStore/media.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#59)

Stores a file once per `localId`; rejects with `media_deleted` when the item was deleted on any device.

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

`item`

</td>
<td>

[`MediaItemInput`](MediaItemInput.md)

</td>
</tr>
<tr>
<td>

`bytes`

</td>
<td>

`Blob` | `Uint8Array`<`ArrayBufferLike`> | [`VaultAttachmentSource`](VaultAttachmentSource.md)

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`MediaItem`](MediaItem.md)>

***

### delete()

> **delete**(`id`: `string`, `signal?`: `AbortSignal`): `Promise`<`boolean`>

Defined in: [src/lib/chatStore/media.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#67)

Deletes an item on every device; false when it was already gone.

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### list()

> **list**(`signal?`: `AbortSignal`): `Promise`<[`MediaItem`](MediaItem.md)\[]>

Defined in: [src/lib/chatStore/media.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#57)

Live items, newest first, after catching up with changes from other devices.

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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`MediaItem`](MediaItem.md)\[]>

***

### read()

> **read**(`id`: `string`, `signal?`: `AbortSignal`): `Promise`<`Uint8Array`<`ArrayBufferLike`> | `null`>

Defined in: [src/lib/chatStore/media.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#65)

The decrypted bytes, or null when the item is gone or its upload has not finished.

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Uint8Array`<`ArrayBufferLike`> | `null`>

***

### subscribe()

> **subscribe**(`listener`: (`event`: `object`) => `void`): () => `void`

Defined in: [src/lib/chatStore/media.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#68)

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

`listener`

</td>
<td>

(`event`: `object`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

> (): `void`

**Returns**

`void`
