# ChatStorageAdapter

Defined in: src/lib/storage/ChatStorageAdapter.ts:95

Backend-agnostic interface for chat/conversation storage.

The method set mirrors the operations we actually use across the SDK:
`*Op` functions in `src/lib/db/chat/operations.ts` plus the `observe*`
patterns used by react hooks. Targeted updates (e.g., `updateMessageError`)
are exposed as separate methods rather than a generic `update()` because
several of them have special semantics (encryption bypass for embeddings,
unique constraints on feedback, etc).

## Methods

### clearMessages()

> **clearMessages**(`conversationId`: `string`): `Promise`<`void`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:138

Clears all messages in a conversation (used for the "clear chat" action).

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### createConversation()

> **createConversation**(`options?`: [`CreateConversationOptions`](CreateConversationOptions.md)): `Promise`<[`StoredConversation`](StoredConversation.md)>

Defined in: src/lib/storage/ChatStorageAdapter.ts:102

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

`options?`

</td>
<td>

[`CreateConversationOptions`](CreateConversationOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)>

***

### createMessage()

> **createMessage**(`options`: [`CreateMessageOptions`](CreateMessageOptions.md)): `Promise`<[`StoredMessage`](StoredMessage.md)>

Defined in: src/lib/storage/ChatStorageAdapter.ts:119

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

[`CreateMessageOptions`](CreateMessageOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md)>

***

### deleteConversation()

> **deleteConversation**(`conversationId`: `string`): `Promise`<`boolean`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:109

Soft delete. Implementations are responsible for cascading to messages/media.

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### getAllFiles()

> **getAllFiles**(): `Promise`<[`StoredFileWithContext`](StoredFileWithContext.md)\[]>

Defined in: src/lib/storage/ChatStorageAdapter.ts:144

**Returns**

`Promise`<[`StoredFileWithContext`](StoredFileWithContext.md)\[]>

***

### getConversation()

> **getConversation**(`conversationId`: `string`): `Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:98

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

***

### getConversations()

> **getConversations**(`options?`: [`ConversationQueryOptions`](ConversationQueryOptions.md)): `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: src/lib/storage/ChatStorageAdapter.ts:100

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

`options?`

</td>
<td>

[`ConversationQueryOptions`](ConversationQueryOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

***

### getMessages()

> **getMessages**(`conversationId`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: src/lib/storage/ChatStorageAdapter.ts:117

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md)\[]>

***

### observeConversations()

> **observeConversations**(`options?`: [`ConversationQueryOptions`](ConversationQueryOptions.md)): [`ChatStorageObservable`](ChatStorageObservable.md)<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: src/lib/storage/ChatStorageAdapter.ts:111

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

`options?`

</td>
<td>

[`ConversationQueryOptions`](ConversationQueryOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

[`ChatStorageObservable`](ChatStorageObservable.md)<[`StoredConversation`](StoredConversation.md)\[]>

***

### observeMessages()

> **observeMessages**(`conversationId`: `string`): [`ChatStorageObservable`](ChatStorageObservable.md)<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: src/lib/storage/ChatStorageAdapter.ts:140

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

[`ChatStorageObservable`](ChatStorageObservable.md)<[`StoredMessage`](StoredMessage.md)\[]>

***

### updateConversationProject()

> **updateConversationProject**(`conversationId`: `string`, `projectId`: `string` | `null`): `Promise`<`boolean`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:106

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`projectId`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### updateConversationTitle()

> **updateConversationTitle**(`conversationId`: `string`, `title`: `string`): `Promise`<`boolean`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:104

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`title`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### updateMessageChunks()

> **updateMessageChunks**(`uniqueId`: `string`, `chunks`: [`MessageChunk`](MessageChunk.md)\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:127

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

`uniqueId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`chunks`

</td>
<td>

[`MessageChunk`](MessageChunk.md)\[]

</td>
</tr>
<tr>
<td>

`embeddingModel`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

***

### updateMessageEmbedding()

> **updateMessageEmbedding**(`uniqueId`: `string`, `vector`: `number`\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:121

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

`uniqueId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`vector`

</td>
<td>

`number`\[]

</td>
</tr>
<tr>
<td>

`embeddingModel`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

***

### updateMessageError()

> **updateMessageError**(`uniqueId`: `string`, `error`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:133

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

`uniqueId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`error`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

***

### updateMessageFeedback()

> **updateMessageFeedback**(`uniqueId`: `string`, `feedback`: [`MessageFeedback`](../type-aliases/MessageFeedback.md)): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:135

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

`uniqueId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`feedback`

</td>
<td>

[`MessageFeedback`](../type-aliases/MessageFeedback.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

***

### write()

> **write**<`T`>(`fn`: (`adapter`: `ChatStorageAdapter`) => `Promise`<`T`>): `Promise`<`T`>

Defined in: src/lib/storage/ChatStorageAdapter.ts:156

Run a set of mutations inside a single write transaction. Any mutation
calls made on the adapter inside the callback are grouped into one atomic
write on backends that support it.

On backends without transaction support, this may fall back to sequential
writes. Implementations must document the guarantee they provide.

**Type Parameters**

<table>
<thead>
<tr>
<th>Type Parameter</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`T`

</td>
</tr>
</tbody>
</table>

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

`fn`

</td>
<td>

(`adapter`: `ChatStorageAdapter`) => `Promise`<`T`>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`T`>
