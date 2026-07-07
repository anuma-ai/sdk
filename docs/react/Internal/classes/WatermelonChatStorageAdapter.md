# WatermelonChatStorageAdapter

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#76)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#81)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#208)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#107)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#173)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#123)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:261](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#261)

**Returns**

`Promise`<[`StoredFileWithContext`](../interfaces/StoredFileWithContext.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getAllFiles`](../interfaces/ChatStorageAdapter.md#getallfiles)

***

### getConversation()

> **getConversation**(`conversationId`: `string`): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#96)

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

### getMessageCount()

> **getMessageCount**(`conversationId`: `string`): `Promise`<`number`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#169)

Total message count for a conversation. Optional (additive change).

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

`Promise`<`number`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getMessageCount`](../interfaces/ChatStorageAdapter.md#getmessagecount)

***

### getMessages()

> **getMessages**(`conversationId`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#154)

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

### getMessageSkeletons()

> **getMessageSkeletons**(`conversationId`: `string`): `Promise`<[`MessageSkeleton`](../interfaces/MessageSkeleton.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#165)

Whole-thread branch-tree skeleton (no decrypt). See
`getMessageSkeletonsOp`. Optional for the same additive-change rationale.

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

`Promise`<[`MessageSkeleton`](../interfaces/MessageSkeleton.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getMessageSkeletons`](../interfaces/ChatStorageAdapter.md#getmessageskeletons)

***

### getMessagesPage()

> **getMessagesPage**(`conversationId`: `string`, `options`: [`GetMessagesPageOptions`](../interfaces/GetMessagesPageOptions.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#158)

Paginated display read: newest `limit` messages (optionally below
`beforeMessageId`), ascending, with embeddings skipped. See
`getMessagesPageOp`.

Optional so this is an additive, non-breaking interface change (same
rationale as [updateMessageFileIds](../interfaces/ChatStorageAdapter.md#updatemessagefileids)). The default
WatermelonChatStorageAdapter provides it.

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

`options`

</td>
<td>

[`GetMessagesPageOptions`](../interfaces/GetMessagesPageOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`getMessagesPage`](../interfaces/ChatStorageAdapter.md#getmessagespage)

***

### observeConversations()

> **observeConversations**(`options?`: [`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)): [`ChatStorageObservable`](../interfaces/ChatStorageObservable.md)<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#127)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#212)

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

### updateConversationPinned()

> **updateConversationPinned**(`conversationId`: `string`, `pinned`: `boolean`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#119)

Pin or unpin a conversation. Pinning stamps `pinnedAt`; list queries are
NOT reordered — consumers sort pinned chats first using `pinnedAt`.

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

`pinned`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateConversationPinned`](../interfaces/ChatStorageAdapter.md#updateconversationpinned)

***

### updateConversationProject()

> **updateConversationProject**(`conversationId`: `string`, `projectId`: `string` | `null`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#115)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#111)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#185)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#177)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#193)

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

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#197)

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

### updateMessageFileIds()

> **updateMessageFileIds**(`uniqueId`: `string`, `fileIds`: `string`\[]): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#204)

Replace a message's attached media ids (`fileIds`). Used to attach a
generated artifact (e.g. a rendered document PDF) to the assistant message
that produced it, after streaming. Pass the FULL desired list.

Optional so this is an additive, non-breaking interface change: only hosts
wiring document/artifact generation need it, and existing custom adapters
keep compiling without implementing it. The default
WatermelonChatStorageAdapter provides it.

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

`fileIds`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

**Implementation of**

[`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md).[`updateMessageFileIds`](../interfaces/ChatStorageAdapter.md#updatemessagefileids)

***

### write()

> **write**<`T`>(`fn`: (`adapter`: [`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md)) => `Promise`<`T`>): `Promise`<`T`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#273)

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
