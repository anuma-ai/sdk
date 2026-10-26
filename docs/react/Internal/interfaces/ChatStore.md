# ChatStore

Defined in: [src/lib/chatStore/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#126)

Explicit versions protect edits; ambiguous writes are never replayed automatically.

## Properties

### attachments

> **attachments**: [`ChatAttachments`](ChatAttachments.md)

Defined in: [src/lib/chatStore/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#141)

## Methods

### account()

> **account**(`signal?`: `AbortSignal`): `Promise`<[`ChatAccount`](ChatAccount.md)>

Defined in: [src/lib/chatStore/types.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#131)

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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChatAccount`](ChatAccount.md)>

***

### activate()

> **activate**(`signal?`: `AbortSignal`): `Promise`<`boolean`>

Defined in: [src/lib/chatStore/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#134)

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

### changes()

> **changes**(`cursor?`: `string`, `options?`: `object`): `Promise`<[`ChatChanges`](ChatChanges.md)>

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

`cursor?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChatChanges`](ChatChanges.md)>

***

### deleteAll()

> **deleteAll**(`signal?`: `AbortSignal`): `Promise`<`number`>

Defined in: [src/lib/chatStore/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#140)

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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`number`>

***

### get()

> **get**(`kind`: [`ChatRecordKind`](../type-aliases/ChatRecordKind.md), `id`: `string`, `signal?`: `AbortSignal`): `Promise`<[`ChatSnapshot`](ChatSnapshot.md) | `null`>

Defined in: [src/lib/chatStore/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#127)

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

### getMany()

> **getMany**(`refs`: readonly [`ChatRef`](ChatRef.md)\[], `signal?`: `AbortSignal`): `Promise`<[`ChatSnapshot`](ChatSnapshot.md)\[]>

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

`refs`

</td>
<td>

readonly [`ChatRef`](ChatRef.md)\[]

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

***

### importRecords()

> **importRecords**(`records`: readonly [`ChatImport`](ChatImport.md)\[], `signal?`: `AbortSignal`): `Promise`<`number`>

Defined in: [src/lib/chatStore/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#132)

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

`records`

</td>
<td>

readonly [`ChatImport`](ChatImport.md)\[]

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

`Promise`<`number`>

***

### list()

> **list**(`options`: [`ChatListOptions`](ChatListOptions.md)): `Promise`<[`ChatPage`](ChatPage.md)>

Defined in: [src/lib/chatStore/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#128)

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

Defined in: [src/lib/chatStore/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#129)

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

***

### search()

> **search**(`embedding`: readonly `number`\[], `options?`: [`ChatSearchOptions`](ChatSearchOptions.md)): `Promise`<[`ChatSearchHit`](ChatSearchHit.md)\[]>

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

`embedding`

</td>
<td>

readonly `number`\[]

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`ChatSearchOptions`](ChatSearchOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChatSearchHit`](ChatSearchHit.md)\[]>

***

### verify()

> **verify**(`revisions`: readonly [`ChatRevision`](ChatRevision.md)\[], `signal?`: `AbortSignal`): `Promise`<[`ChatRef`](ChatRef.md)\[]>

Defined in: [src/lib/chatStore/types.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#133)

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

`revisions`

</td>
<td>

readonly [`ChatRevision`](ChatRevision.md)\[]

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

`Promise`<[`ChatRef`](ChatRef.md)\[]>
