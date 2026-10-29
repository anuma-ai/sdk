# VaultAttachmentCache

Defined in: [src/lib/chatStore/vaultAttachments.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#27)

Device-side store for decrypted attachment bytes, keyed by vault attachment id.

## Methods

### delete()

> **delete**(`attachmentId`: `string`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#30)

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

Defined in: [src/lib/chatStore/vaultAttachments.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#28)

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

Defined in: [src/lib/chatStore/vaultAttachments.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#29)

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
