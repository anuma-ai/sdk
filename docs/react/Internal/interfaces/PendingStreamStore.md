# PendingStreamStore

Defined in: [src/lib/chat/pendingStreams.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/pendingStreams.ts#19)

Durable record of background turns, so a later session can recover their answers.

## Methods

### list()

> **list**(): [`PendingStream`](../type-aliases/PendingStream.md)\[]

Defined in: [src/lib/chat/pendingStreams.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/pendingStreams.ts#20)

**Returns**

[`PendingStream`](../type-aliases/PendingStream.md)\[]

***

### put()

> **put**(`stream`: [`PendingStream`](../type-aliases/PendingStream.md)): `void`

Defined in: [src/lib/chat/pendingStreams.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/pendingStreams.ts#21)

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

`stream`

</td>
<td>

[`PendingStream`](../type-aliases/PendingStream.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### remove()

> **remove**(`parentMessageId`: `string`): `void`

Defined in: [src/lib/chat/pendingStreams.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/pendingStreams.ts#22)

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

`parentMessageId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
