# VaultAttachments

Defined in: [src/lib/chatStore/vaultAttachments.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#55)

Encrypted chat attachments in vault: upload, bind to a message, read back on any device, delete.

## Methods

### commit()

> **commit**(`attachmentId`: `string`, `owner`: [`VaultAttachmentOwner`](VaultAttachmentOwner.md), `signal?`: `AbortSignal`): `Promise`<[`ChatAttachment`](ChatAttachment.md)>

Defined in: [src/lib/chatStore/vaultAttachments.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#59)

Binds an uploaded attachment to a message or summary that vault already holds.

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

`owner`

</td>
<td>

[`VaultAttachmentOwner`](VaultAttachmentOwner.md)

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

`Promise`<[`ChatAttachment`](ChatAttachment.md)>

***

### delete()

> **delete**(`attachmentId`: `string`, `signal?`: `AbortSignal`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#66)

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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### read()

> **read**(`attachmentId`: `string`, `signal?`: `AbortSignal`): `Promise`<`Uint8Array`<`ArrayBufferLike`> | `null`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#65)

The decrypted bytes, or null when the attachment is gone or not yet committed.

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

### upload()

> **upload**(`bytes`: `Uint8Array`, `options?`: [`VaultAttachmentUploadOptions`](VaultAttachmentUploadOptions.md)): `Promise`<`string`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#57)

Encrypts and uploads `bytes`; the attachment stays pending until `commit`, and vault drops it after 24h.

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

`bytes`

</td>
<td>

`Uint8Array`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`VaultAttachmentUploadOptions`](VaultAttachmentUploadOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>
