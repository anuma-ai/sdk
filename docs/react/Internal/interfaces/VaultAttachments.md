# VaultAttachments

Defined in: [src/lib/chatStore/vaultAttachments.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#92)

Encrypted chat attachments in vault: upload, bind to a message, read back on any device, delete.

## Methods

### commit()

> **commit**(`attachmentId`: `string`, `owner`: [`VaultAttachmentOwner`](VaultAttachmentOwner.md), `signal?`: `AbortSignal`): `Promise`<[`ChatAttachment`](ChatAttachment.md)>

Defined in: [src/lib/chatStore/vaultAttachments.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#99)

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

Defined in: [src/lib/chatStore/vaultAttachments.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#114)

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

Defined in: [src/lib/chatStore/vaultAttachments.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#105)

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

### readSealedTo()

> **readSealedTo**(`attachmentId`: `string`, `sink`: [`VaultAttachmentSink`](VaultAttachmentSink.md), `signal?`: `AbortSignal`): `Promise`<`boolean`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#109)

Downloads the ciphertext into `sink` exactly as vault stores it, without decrypting; false when the attachment is gone or not yet committed.

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

`sink`

</td>
<td>

[`VaultAttachmentSink`](VaultAttachmentSink.md)

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

### readTo()

> **readTo**(`attachmentId`: `string`, `sink`: [`VaultAttachmentSink`](VaultAttachmentSink.md), `signal?`: `AbortSignal`): `Promise`<`boolean`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#107)

Downloads and decrypts into `sink` a few chunks at a time; false when the attachment is gone or not yet committed.

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

`sink`

</td>
<td>

[`VaultAttachmentSink`](VaultAttachmentSink.md)

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

### upload()

> **upload**(`source`: `Blob` | `Uint8Array`<`ArrayBufferLike`> | [`VaultAttachmentSource`](VaultAttachmentSource.md), `options?`: [`VaultAttachmentUploadOptions`](VaultAttachmentUploadOptions.md)): `Promise`<`string`>

Defined in: [src/lib/chatStore/vaultAttachments.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#94)

Encrypts and uploads a file, in parts when it is over 50 MiB and vault takes parts; the attachment stays pending until `commit`, and vault drops it after 24h.

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

`source`

</td>
<td>

`Blob` | `Uint8Array`<`ArrayBufferLike`> | [`VaultAttachmentSource`](VaultAttachmentSource.md)

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
