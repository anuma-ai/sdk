# VaultAttachmentSource

Defined in: [src/lib/chatStore/vaultAttachments.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#48)

A file read in pieces, so a large upload never holds the whole file in memory.

## Properties

### size

> **size**: `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#49)

## Methods

### read()

> **read**(`offset`: `number`, `length`: `number`): `Promise`<`Uint8Array`<`ArrayBufferLike`>>

Defined in: [src/lib/chatStore/vaultAttachments.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#50)

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

`offset`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`length`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Uint8Array`<`ArrayBufferLike`>>
