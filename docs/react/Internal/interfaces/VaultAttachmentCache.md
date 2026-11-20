# VaultAttachmentCache

Defined in: [src/lib/chatStore/vaultAttachments.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#32)

Device-side store for decrypted attachment bytes, keyed by vault attachment id.

## Methods

### delete()

> **delete**(`attachmentId`: `string`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#35)

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

`attachmentId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### get()

> **get**(`attachmentId`: `string`): `Promise`<`Uint8Array`<`ArrayBufferLike`> | `null`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#33)

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

`attachmentId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Uint8Array`<`ArrayBufferLike`> | `null`>

***

### set()

> **set**(`attachmentId`: `string`, `bytes`: `Uint8Array`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#34)

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

`attachmentId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`bytes`

</td>
<td>

`Uint8Array`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>
