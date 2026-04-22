# WatermelonChatStorageAdapter

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#69)

Backend-agnostic interface for chat/conversation storage.

The method set mirrors the operations we actually use across the SDK:
`*Op` functions in `src/lib/db/chat/operations.ts` plus the `observe*`
patterns used by react hooks. Targeted updates (e.g., `updateMessageError`)
are exposed as separate methods rather than a generic `update()` because
several of them have special semantics (encryption bypass for embeddings,
unique constraints on feedback, etc).

## Implements

* [`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md)

## Constructors

### Constructor

> **new WatermelonChatStorageAdapter**(`options`: [`WatermelonChatStorageAdapterOptions`](../interfaces/WatermelonChatStorageAdapterOptions.md)): `WatermelonChatStorageAdapter`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#74)

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

[`WatermelonChatStorageAdapterOptions`](../interfaces/WatermelonChatStorageAdapterOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`WatermelonChatStorageAdapter`

## Methods

### clearMessages()

> **clearMessages**(`conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#178)

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

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`clearMessages`](../interfaces/ChatStorageAdapter.md#clearmessages)

***

### createConversation()

> **createConversation**(`options?`: [`CreateConversationOptions`](../interfaces/CreateConversationOptions.md)): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#100)

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

[`CreateConversationOptions`](../interfaces/CreateConversationOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`createConversation`](../interfaces/ChatStorageAdapter.md#createconversation)

***

### createMessage()

> **createMessage**(`options`: [`CreateMessageOptions`](../interfaces/CreateMessageOptions.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#147)

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

[`CreateMessageOptions`](../interfaces/CreateMessageOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`createMessage`](../interfaces/ChatStorageAdapter.md#createmessage)

***

### deleteConversation()

> **deleteConversation**(`conversationId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#112)

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

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`deleteConversation`](../interfaces/ChatStorageAdapter.md#deleteconversation)

***

### getAllFiles()

> **getAllFiles**(): `Promise`<[`StoredFileWithContext`](../interfaces/StoredFileWithContext.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#211)

**Returns**

`Promise`<[`StoredFileWithContext`](../interfaces/StoredFileWithContext.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getAllFiles`](../interfaces/ChatStorageAdapter.md#getallfiles)

***

### getConversation()

> **getConversation**(`conversationId`: `string`): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#89)

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

`Promise`<[`StoredConversation`](../interfaces/StoredConversation.md) | `null`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getConversation`](../interfaces/ChatStorageAdapter.md#getconversation)

***

### getConversations()

> **getConversations**(`options?`: [`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#93)

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

[`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getConversations`](../interfaces/ChatStorageAdapter.md#getconversations)

***

### getMessages()

> **getMessages**(`conversationId`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#143)

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

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getMessages`](../interfaces/ChatStorageAdapter.md#getmessages)

***

### observeConversations()

> **observeConversations**(`options?`: [`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)): [`ChatStorageObservable`](../interfaces/ChatStorageObservable.md)<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#116)

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

[`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

[`ChatStorageObservable`](../interfaces/ChatStorageObservable.md)<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`observeConversations`](../interfaces/ChatStorageAdapter.md#observeconversations)

***

### observeMessages()

> **observeMessages**(`conversationId`: `string`): [`ChatStorageObservable`](../interfaces/ChatStorageObservable.md)<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#182)

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

[`ChatStorageObservable`](../interfaces/ChatStorageObservable.md)<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`observeMessages`](../interfaces/ChatStorageAdapter.md#observemessages)

***

### updateConversationProject()

> **updateConversationProject**(`conversationId`: `string`, `projectId`: `string` | `null`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#108)

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

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateConversationProject`](../interfaces/ChatStorageAdapter.md#updateconversationproject)

***

### updateConversationTitle()

> **updateConversationTitle**(`conversationId`: `string`, `title`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#104)

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

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateConversationTitle`](../interfaces/ChatStorageAdapter.md#updateconversationtitle)

***

### updateMessageChunks()

> **updateMessageChunks**(`uniqueId`: `string`, `chunks`: [`MessageChunk`](../interfaces/MessageChunk.md)\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#159)

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

[`MessageChunk`](../interfaces/MessageChunk.md)\[]

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

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateMessageChunks`](../interfaces/ChatStorageAdapter.md#updatemessagechunks)

***

### updateMessageEmbedding()

> **updateMessageEmbedding**(`uniqueId`: `string`, `vector`: `number`\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#151)

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

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateMessageEmbedding`](../interfaces/ChatStorageAdapter.md#updatemessageembedding)

***

### updateMessageError()

> **updateMessageError**(`uniqueId`: `string`, `error`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#167)

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

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateMessageError`](../interfaces/ChatStorageAdapter.md#updatemessageerror)

***

### updateMessageFeedback()

> **updateMessageFeedback**(`uniqueId`: `string`, `feedback`: [`MessageFeedback`](../type-aliases/MessageFeedback.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#171)

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

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateMessageFeedback`](../interfaces/ChatStorageAdapter.md#updatemessagefeedback)

***

### write()

> **write**<`T`>(`fn`: (`adapter`: [`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md)) => `Promise`<`T`>): `Promise`<`T`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#223)

WatermelonDB nests `database.write()` safely: each method we call inside
the callback already wraps its own writes, and Watermelon collapses the
nesting under a single action. The callback receives the same adapter
instance.

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

(`adapter`: [`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md)) => `Promise`<`T`>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`T`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`write`](../interfaces/ChatStorageAdapter.md#write)
