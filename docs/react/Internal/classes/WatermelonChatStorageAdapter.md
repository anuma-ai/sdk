# WatermelonChatStorageAdapter

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#89)

Everything `useChatStorage` reads and writes for chats, so a hook can run on local or server storage.

## Implements

* [`ChatBackend`](../interfaces/ChatBackend.md)

## Constructors

### Constructor

> **new WatermelonChatStorageAdapter**(`options`: [`WatermelonChatStorageAdapterOptions`](../interfaces/WatermelonChatStorageAdapterOptions.md)): `WatermelonChatStorageAdapter`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#94)

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

### addMemoryLinks()

> **addMemoryLinks**(`conversationId`: `string`, `items`: [`ConversationMemoryInput`](../interfaces/ConversationMemoryInput.md)\[]): `Promise`<`void`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#315)

Records the memories a turn drew on in recall order, moving already-linked ones to this turn with their new score.

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

`items`

</td>
<td>

[`ConversationMemoryInput`](../interfaces/ConversationMemoryInput.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`addMemoryLinks`](../interfaces/ChatBackend.md#addmemorylinks)

***

### clearMemoryLinks()

> **clearMemoryLinks**(`conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#319)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`clearMemoryLinks`](../interfaces/ChatBackend.md#clearmemorylinks)

***

### clearMessages()

> **clearMessages**(`conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#224)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`clearMessages`](../interfaces/ChatBackend.md#clearmessages)

***

### createConversation()

> **createConversation**(`options?`: [`CreateConversationOptions`](../interfaces/CreateConversationOptions.md), `defaultTitle?`: `string`): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#118)

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
<tr>
<td>

`defaultTitle?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`createConversation`](../interfaces/ChatBackend.md#createconversation)

***

### createMessage()

> **createMessage**(`options`: [`CreateMessageOptions`](../interfaces/CreateMessageOptions.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#189)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`createMessage`](../interfaces/ChatBackend.md#createmessage)

***

### deleteConversation()

> **deleteConversation**(`conversationId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#137)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`deleteConversation`](../interfaces/ChatBackend.md#deleteconversation)

***

### deleteMessage()

> **deleteMessage**(`uniqueId`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:307](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#307)

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
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`deleteMessage`](../interfaces/ChatBackend.md#deletemessage)

***

### deleteSummary()

> **deleteSummary**(`conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#303)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`deleteSummary`](../interfaces/ChatBackend.md#deletesummary)

***

### getAllFiles()

> **getAllFiles**(`options?`: `object`): `Promise`<[`StoredFileWithContext`](../interfaces/StoredFileWithContext.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#262)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.conversationId?`

</td>
<td>

`string`

</td>
<td>

Filter files by conversation ID

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
<td>

Maximum number of files to return

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredFileWithContext`](../interfaces/StoredFileWithContext.md)\[]>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`getAllFiles`](../interfaces/ChatBackend.md#getallfiles)

***

### getConversation()

> **getConversation**(`conversationId`: `string`): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md) | `null`>

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`getConversation`](../interfaces/ChatBackend.md#getconversation)

***

### getConversations()

> **getConversations**(`options?`: [`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`getConversations`](../interfaces/ChatBackend.md#getconversations)

***

### getMemoryLinks()

> **getMemoryLinks**(`conversationId`: `string`): `Promise`<[`StoredConversationMemory`](../interfaces/StoredConversationMemory.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#311)

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

`Promise`<[`StoredConversationMemory`](../interfaces/StoredConversationMemory.md)\[]>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`getMemoryLinks`](../interfaces/ChatBackend.md#getmemorylinks)

***

### getMessageCount()

> **getMessageCount**(`conversationId`: `string`): `Promise`<`number`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#185)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`getMessageCount`](../interfaces/ChatBackend.md#getmessagecount)

***

### getMessages()

> **getMessages**(`conversationId`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#166)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`getMessages`](../interfaces/ChatBackend.md#getmessages)

***

### getMessagesByIds()

> **getMessagesByIds**(`uniqueIds`: readonly `string`\[]): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#177)

Reads messages by id in the order asked, leaving out ids that are not stored.

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

`uniqueIds`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`getMessagesByIds`](../interfaces/ChatBackend.md#getmessagesbyids)

***

### getMessageSkeletons()

> **getMessageSkeletons**(`conversationId`: `string`): `Promise`<[`MessageSkeleton`](../interfaces/MessageSkeleton.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#181)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`getMessageSkeletons`](../interfaces/ChatBackend.md#getmessageskeletons)

***

### getMessagesPage()

> **getMessagesPage**(`conversationId`: `string`, `options`: [`GetMessagesPageOptions`](../interfaces/GetMessagesPageOptions.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#170)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`getMessagesPage`](../interfaces/ChatBackend.md#getmessagespage)

***

### getSummary()

> **getSummary**(`conversationId`: `string`): `Promise`<`StoredConversationSummary` | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#281)

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

`Promise`<`StoredConversationSummary` | `null`>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`getSummary`](../interfaces/ChatBackend.md#getsummary)

***

### getToolCallEventIds()

> **getToolCallEventIds**(`conversationId`: `string`): `Promise`<`Set`<`string`>>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#266)

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

`Promise`<`Set`<`string`>>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`getToolCallEventIds`](../interfaces/ChatBackend.md#gettoolcalleventids)

***

### observeConversations()

> **observeConversations**(`options?`: [`ConversationQueryOptions`](../interfaces/ConversationQueryOptions.md)): [`ChatStorageObservable`](../interfaces/ChatStorageObservable.md)<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#141)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`observeConversations`](../interfaces/ChatBackend.md#observeconversations)

***

### observeMessages()

> **observeMessages**(`conversationId`: `string`): [`ChatStorageObservable`](../interfaces/ChatStorageObservable.md)<[`StoredMessage`](../interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#228)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`observeMessages`](../interfaces/ChatBackend.md#observemessages)

***

### searchChunks()

> **searchChunks**(`queryVector`: `number`\[], `options?`: [`ChatChunkSearchOptions`](../interfaces/ChatChunkSearchOptions.md)): `Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#274)

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

`queryVector`

</td>
<td>

`number`\[]

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`ChatChunkSearchOptions`](../interfaces/ChatChunkSearchOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`searchChunks`](../interfaces/ChatBackend.md#searchchunks)

***

### updateConversationPinned()

> **updateConversationPinned**(`conversationId`: `string`, `pinned`: `boolean`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#133)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateConversationPinned`](../interfaces/ChatBackend.md#updateconversationpinned)

***

### updateConversationProject()

> **updateConversationProject**(`conversationId`: `string`, `projectId`: `string` | `null`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#129)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateConversationProject`](../interfaces/ChatBackend.md#updateconversationproject)

***

### updateConversationTitle()

> **updateConversationTitle**(`conversationId`: `string`, `title`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#125)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateConversationTitle`](../interfaces/ChatBackend.md#updateconversationtitle)

***

### updateMessageChunks()

> **updateMessageChunks**(`uniqueId`: `string`, `chunks`: [`MessageChunk`](../interfaces/MessageChunk.md)\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#201)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateMessageChunks`](../interfaces/ChatBackend.md#updatemessagechunks)

***

### updateMessageEmbedding()

> **updateMessageEmbedding**(`uniqueId`: `string`, `vector`: `number`\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateMessageEmbedding`](../interfaces/ChatBackend.md#updatemessageembedding)

***

### updateMessageError()

> **updateMessageError**(`uniqueId`: `string`, `error`: `string`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#209)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateMessageError`](../interfaces/ChatBackend.md#updatemessageerror)

***

### updateMessageFeedback()

> **updateMessageFeedback**(`uniqueId`: `string`, `feedback`: [`MessageFeedback`](../type-aliases/MessageFeedback.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#213)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateMessageFeedback`](../interfaces/ChatBackend.md#updatemessagefeedback)

***

### updateMessageFileIds()

> **updateMessageFileIds**(`uniqueId`: `string`, `fileIds`: `string`\[]): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#220)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`updateMessageFileIds`](../interfaces/ChatBackend.md#updatemessagefileids)

***

### upsertMessage()

> **upsertMessage**(`options`: [`CreateMessageOptions`](../interfaces/CreateMessageOptions.md) & `object`): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#270)

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

[`CreateMessageOptions`](../interfaces/CreateMessageOptions.md) & `object`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md)>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`upsertMessage`](../interfaces/ChatBackend.md#upsertmessage)

***

### upsertSummary()

> **upsertSummary**(`conversationId`: `string`, `summary`: `string`, `summarizedUpTo`: `string`, `tokenCount`: `number`): `Promise`<`StoredConversationSummary`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#288)

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

`summary`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`summarizedUpTo`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`tokenCount`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`StoredConversationSummary`>

**Implementation of**

[`ChatBackend`](../interfaces/ChatBackend.md).[`upsertSummary`](../interfaces/ChatBackend.md#upsertsummary)

***

### write()

> **write**<`T`>(`fn`: (`adapter`: [`ChatStorageAdapter`](../interfaces/ChatStorageAdapter.md)) => `Promise`<`T`>): `Promise`<`T`>

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:338](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#338)

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

[`ChatBackend`](../interfaces/ChatBackend.md).[`write`](../interfaces/ChatBackend.md#write)
