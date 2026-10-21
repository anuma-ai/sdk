# ChatStore

Defined in: [src/lib/chatStore/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#43)

Explicit versions protect edits; ambiguous writes are never replayed automatically.

## Methods

### get()

> **get**(`kind`: [`ChatRecordKind`](../type-aliases/ChatRecordKind.md), `id`: `string`, `signal?`: `AbortSignal`): `Promise`<[`ChatSnapshot`](ChatSnapshot.md) | `null`>

Defined in: [src/lib/chatStore/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#44)

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

`kind`

</td>
<td>

[`ChatRecordKind`](../type-aliases/ChatRecordKind.md)

</td>
</tr>
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

`Promise`<[`ChatSnapshot`](ChatSnapshot.md) | `null`>

***

### list()

> **list**(`options`: [`ChatListOptions`](ChatListOptions.md)): `Promise`<[`ChatPage`](ChatPage.md)>

Defined in: [src/lib/chatStore/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#45)

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

`options`

</td>
<td>

[`ChatListOptions`](ChatListOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChatPage`](ChatPage.md)>

***

### putMany()

> **putMany**(`writes`: readonly [`ChatWrite`](ChatWrite.md)\[], `signal?`: `AbortSignal`): `Promise`<[`ChatSnapshot`](ChatSnapshot.md)\[]>

Defined in: [src/lib/chatStore/types.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#46)

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

`writes`

</td>
<td>

readonly [`ChatWrite`](ChatWrite.md)\[]

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

`Promise`<[`ChatSnapshot`](ChatSnapshot.md)\[]>
