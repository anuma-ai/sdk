# ChatStore

Defined in: [src/lib/chatStore/types.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#158)

Explicit versions protect edits; ambiguous writes are never replayed automatically.

## Properties

### attachments

> **attachments**: [`ChatAttachments`](ChatAttachments.md)

Defined in: [src/lib/chatStore/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#183)

***

### mediaAttachments?

> `optional` **mediaAttachments**: `boolean`

Defined in: [src/lib/chatStore/types.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#182)

True when vault stores `media` records and attachments owned by `media` and `app_file` records.

## Methods

### account()

> **account**(`signal?`: `AbortSignal`): `Promise`<[`ChatAccount`](ChatAccount.md)>

Defined in: [src/lib/chatStore/types.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#163)

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

Defined in: [src/lib/chatStore/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#167)

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

Defined in: [src/lib/chatStore/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#169)

Without `kinds`, vault returns every kind except `setting`.

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

`options.kinds?`

</td>
<td>

readonly [`ChatRecordKind`](../type-aliases/ChatRecordKind.md)\[]

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

Defined in: [src/lib/chatStore/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#178)

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

Defined in: [src/lib/chatStore/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#159)

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

Defined in: [src/lib/chatStore/types.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#162)

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

Defined in: [src/lib/chatStore/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#165)

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

### indexTermsPage()?

> `optional` **indexTermsPage**(`cursor?`: `string`, `signal?`: `AbortSignal`): `Promise`<[`ChatTermsPage`](ChatTermsPage.md)>

Defined in: [src/lib/chatStore/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#177)

Stores word hashes for one page of records vault has none for; call again with `nextCursor` until it is absent.

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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChatTermsPage`](ChatTermsPage.md)>

***

### list()

> **list**(`options`: [`ChatListOptions`](ChatListOptions.md)): `Promise`<[`ChatPage`](ChatPage.md)>

Defined in: [src/lib/chatStore/types.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#160)

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

### sealedId()?

> `optional` **sealedId**(`value`: `string`): `Promise`<`string`>

Defined in: [src/lib/chatStore/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#180)

A keyed hash vault cannot reproduce, for record ids derived from private names.

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

`value`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>

***

### search()

> **search**(`embedding`: readonly `number`\[], `options?`: [`ChatSearchOptions`](ChatSearchOptions.md)): `Promise`<[`ChatSearchHit`](ChatSearchHit.md)\[]>

Defined in: [src/lib/chatStore/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#173)

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

### searchTerms()?

> `optional` **searchTerms**(`query`: `string`, `options?`: [`ChatTermSearchOptions`](ChatTermSearchOptions.md)): `Promise`<[`ChatPage`](ChatPage.md)>

Defined in: [src/lib/chatStore/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#175)

Messages and summaries holding every word of `query`, newest first; present when vault keeps keyed word hashes.

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

`query`

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

[`ChatTermSearchOptions`](ChatTermSearchOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChatPage`](ChatPage.md)>

***

### takeConnectedAccount()?

> `optional` **takeConnectedAccount**(): [`ChatAccount`](ChatAccount.md) | `undefined`

Defined in: [src/lib/chatStore/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#164)

**Returns**

[`ChatAccount`](ChatAccount.md) | `undefined`

***

### verify()

> **verify**(`revisions`: readonly [`ChatRevision`](ChatRevision.md)\[], `signal?`: `AbortSignal`): `Promise`<[`ChatRef`](ChatRef.md)\[]>

Defined in: [src/lib/chatStore/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#166)

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
