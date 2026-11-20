# ChatAttachments

Defined in: [src/lib/chatStore/types.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#145)

## Properties

### multipart?

> `optional` **multipart**: [`ChatMultipartAttachments`](ChatMultipartAttachments.md)

Defined in: [src/lib/chatStore/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#151)

Present when vault takes attachments over 50 MiB in parts.

## Methods

### commit()

> **commit**(`attachmentId`: `string`, `owner`: `object`, `signal?`: `AbortSignal`): `Promise`<[`ChatAttachment`](ChatAttachment.md)>

Defined in: [src/lib/chatStore/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#152)

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

`object`

</td>
</tr>
<tr>
<td>

`owner.id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`owner.kind?`

</td>
<td>

[`ChatAttachmentOwnerKind`](../type-aliases/ChatAttachmentOwnerKind.md)

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

### create()

> **create**(`sizeBytes`: `number`, `signal?`: `AbortSignal`): `Promise`<{ `attachment`: [`ChatAttachment`](ChatAttachment.md); `upload`: [`ChatPresignedUrl`](ChatPresignedUrl.md); }>

Defined in: [src/lib/chatStore/types.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#146)

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

`Promise`<{ `attachment`: [`ChatAttachment`](ChatAttachment.md); `upload`: [`ChatPresignedUrl`](ChatPresignedUrl.md); }>

***

### delete()

> **delete**(`attachmentId`: `string`, `signal?`: `AbortSignal`): `Promise`<`void`>

Defined in: [src/lib/chatStore/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#161)

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

### get()

> **get**(`attachmentId`: `string`, `signal?`: `AbortSignal`): `Promise`<{ `attachment`: [`ChatAttachment`](ChatAttachment.md); `download?`: [`ChatPresignedUrl`](ChatPresignedUrl.md); } | `null`>

Defined in: [src/lib/chatStore/types.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#157)

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

`Promise`<{ `attachment`: [`ChatAttachment`](ChatAttachment.md); `download?`: [`ChatPresignedUrl`](ChatPresignedUrl.md); } | `null`>
