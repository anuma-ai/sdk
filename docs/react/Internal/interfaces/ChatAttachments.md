# ChatAttachments

Defined in: [src/lib/chatStore/types.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#125)

## Methods

### commit()

> **commit**(`attachmentId`: `string`, `owner`: `object`, `signal?`: `AbortSignal`): `Promise`<[`ChatAttachment`](ChatAttachment.md)>

Defined in: [src/lib/chatStore/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#130)

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

Defined in: [src/lib/chatStore/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#126)

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

Defined in: [src/lib/chatStore/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#139)

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

Defined in: [src/lib/chatStore/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#135)

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
