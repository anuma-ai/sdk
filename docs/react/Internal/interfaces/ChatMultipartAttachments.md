# ChatMultipartAttachments

Defined in: [src/lib/chatStore/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#129)

## Properties

### maxBytes

> **maxBytes**: `number`

Defined in: [src/lib/chatStore/types.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#131)

The largest ciphertext vault takes in parts.

## Methods

### create()

> **create**(`sizeBytes`: `number`, `signal?`: `AbortSignal`): `Promise`<{ `attachment`: [`ChatAttachment`](ChatAttachment.md); `partBytes`: `number`; `partCount`: `number`; }>

Defined in: [src/lib/chatStore/types.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#133)

Reserves more than 50 MiB; every part but the last holds exactly `partBytes`.

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

`sizeBytes`

</td>
<td>

`number`

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

`Promise`<{ `attachment`: [`ChatAttachment`](ChatAttachment.md); `partBytes`: `number`; `partCount`: `number`; }>

***

### parts()

> **parts**(`attachmentId`: `string`, `partNumbers`: readonly `number`\[], `signal?`: `AbortSignal`): `Promise`<[`ChatPresignedPart`](ChatPresignedPart.md)\[]>

Defined in: [src/lib/chatStore/types.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#138)

Upload URLs for up to 100 parts of a pending reservation; call again when they expire.

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

`partNumbers`

</td>
<td>

readonly `number`\[]

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

`Promise`<[`ChatPresignedPart`](ChatPresignedPart.md)\[]>
