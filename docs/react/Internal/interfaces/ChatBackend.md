# ChatBackend

Defined in: [src/lib/storage/ChatBackend.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#31)

Everything `useChatStorage` reads and writes for chats, so a hook can run on local or server storage.

## Extends

* [`ChatStorageAdapter`](ChatStorageAdapter.md)

## Extended by

* [`VaultChatBackend`](VaultChatBackend.md)

## Methods

### addMemoryLinks()

> **addMemoryLinks**(`conversationId`: `string`, `items`: [`ConversationMemoryInput`](ConversationMemoryInput.md)\[]): `Promise`<`void`>

Defined in: [src/lib/storage/ChatBackend.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#62)

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

[`ConversationMemoryInput`](ConversationMemoryInput.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### clearMemoryLinks()

> **clearMemoryLinks**(`conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/storage/ChatBackend.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#63)

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

### clearMessages()

> **clearMessages**(`conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#125)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`clearMessages`](ChatStorageAdapter.md#clearmessages)

***

### createConversation()

> **createConversation**(`options?`: [`CreateConversationOptions`](CreateConversationOptions.md), `defaultTitle?`: `string`): `Promise`<[`StoredConversation`](StoredConversation.md)>

Defined in: [src/lib/storage/ChatBackend.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#32)

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

`Promise`<[`StoredConversation`](StoredConversation.md)>

**Overrides**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`createConversation`](ChatStorageAdapter.md#createconversation)

***

### createMessage()

> **createMessage**(`options`: [`CreateMessageOptions`](CreateMessageOptions.md)): `Promise`<[`StoredMessage`](StoredMessage.md)>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#94)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`createMessage`](ChatStorageAdapter.md#createmessage)

***

### deleteConversation()

> **deleteConversation**(`conversationId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#63)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`deleteConversation`](ChatStorageAdapter.md#deleteconversation)

***

### deleteMessage()

> **deleteMessage**(`uniqueId`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/storage/ChatBackend.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#59)

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

***

### deleteSummary()

> **deleteSummary**(`conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/storage/ChatBackend.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#58)

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

### getAllFiles()

> **getAllFiles**(`options?`: `object`): `Promise`<[`StoredFileWithContext`](StoredFileWithContext.md)\[]>

Defined in: [src/lib/storage/ChatBackend.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#36)

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

`Promise`<[`StoredFileWithContext`](StoredFileWithContext.md)\[]>

**Overrides**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`getAllFiles`](ChatStorageAdapter.md#getallfiles)

***

### getConversation()

> **getConversation**(`conversationId`: `string`): `Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#48)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`getConversation`](ChatStorageAdapter.md#getconversation)

***

### getConversations()

> **getConversations**(`options?`: [`ConversationQueryOptions`](ConversationQueryOptions.md)): `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#50)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`getConversations`](ChatStorageAdapter.md#getconversations)

***

### getMemoryLinks()

> **getMemoryLinks**(`conversationId`: `string`): `Promise`<[`StoredConversationMemory`](StoredConversationMemory.md)\[]>

Defined in: [src/lib/storage/ChatBackend.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#60)

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

`Promise`<[`StoredConversationMemory`](StoredConversationMemory.md)\[]>

***

### getMessageCount()

> **getMessageCount**(`conversationId`: `string`): `Promise`<`number`>

Defined in: [src/lib/storage/ChatBackend.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#44)

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

**Overrides**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`getMessageCount`](ChatStorageAdapter.md#getmessagecount)

***

### getMessages()

> **getMessages**(`conversationId`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#69)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`getMessages`](ChatStorageAdapter.md#getmessages)

***

### getMessagesByIds()

> **getMessagesByIds**(`uniqueIds`: readonly `string`\[]): `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: [src/lib/storage/ChatBackend.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#43)

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

`Promise`<[`StoredMessage`](StoredMessage.md)\[]>

***

### getMessageSkeletons()

> **getMessageSkeletons**(`conversationId`: `string`): `Promise`<[`MessageSkeleton`](MessageSkeleton.md)\[]>

Defined in: [src/lib/storage/ChatBackend.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#41)

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

`Promise`<[`MessageSkeleton`](MessageSkeleton.md)\[]>

**Overrides**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`getMessageSkeletons`](ChatStorageAdapter.md#getmessageskeletons)

***

### getMessagesPage()

> **getMessagesPage**(`conversationId`: `string`, `options`: [`GetMessagesPageOptions`](GetMessagesPageOptions.md)): `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: [src/lib/storage/ChatBackend.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#37)

Paginated display read: newest `limit` messages (optionally below
`beforeMessageId`), ascending, with embeddings skipped. See
`getMessagesPageOp`.

Optional so this is an additive, non-breaking interface change (same
rationale as [updateMessageFileIds](ChatStorageAdapter.md#updatemessagefileids)). The default
[WatermelonChatStorageAdapter](../classes/WatermelonChatStorageAdapter.md) provides it.

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

[`GetMessagesPageOptions`](GetMessagesPageOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md)\[]>

**Overrides**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`getMessagesPage`](ChatStorageAdapter.md#getmessagespage)

***

### getSummary()

> **getSummary**(`conversationId`: `string`): `Promise`<`StoredConversationSummary` | `null`>

Defined in: [src/lib/storage/ChatBackend.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#51)

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

***

### getToolCallEventIds()

> **getToolCallEventIds**(`conversationId`: `string`): `Promise`<`Set`<`string`>>

Defined in: [src/lib/storage/ChatBackend.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#45)

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

***

### observeConversations()

> **observeConversations**(`options?`: [`ConversationQueryOptions`](ConversationQueryOptions.md)): [`ChatStorageObservable`](ChatStorageObservable.md)<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#65)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`observeConversations`](ChatStorageAdapter.md#observeconversations)

***

### observeMessages()

> **observeMessages**(`conversationId`: `string`): [`ChatStorageObservable`](ChatStorageObservable.md)<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#127)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`observeMessages`](ChatStorageAdapter.md#observemessages)

***

### searchChunks()

> **searchChunks**(`queryVector`: `number`\[], `options?`: [`ChatChunkSearchOptions`](ChatChunkSearchOptions.md)): `Promise`<[`ChunkSearchResult`](ChunkSearchResult.md)\[]>

Defined in: [src/lib/storage/ChatBackend.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#47)

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

[`ChatChunkSearchOptions`](ChatChunkSearchOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChunkSearchResult`](ChunkSearchResult.md)\[]>

***

### updateConversationPinned()

> **updateConversationPinned**(`conversationId`: `string`, `pinned`: `boolean`): `Promise`<`boolean`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#60)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateConversationPinned`](ChatStorageAdapter.md#updateconversationpinned)

***

### updateConversationProject()

> **updateConversationProject**(`conversationId`: `string`, `projectId`: `string` | `null`): `Promise`<`boolean`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#56)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateConversationProject`](ChatStorageAdapter.md#updateconversationproject)

***

### updateConversationTitle()

> **updateConversationTitle**(`conversationId`: `string`, `title`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#54)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateConversationTitle`](ChatStorageAdapter.md#updateconversationtitle)

***

### updateMessageChunks()

> **updateMessageChunks**(`uniqueId`: `string`, `chunks`: [`MessageChunk`](MessageChunk.md)\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#102)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateMessageChunks`](ChatStorageAdapter.md#updatemessagechunks)

***

### updateMessageEmbedding()

> **updateMessageEmbedding**(`uniqueId`: `string`, `vector`: `number`\[], `embeddingModel`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#96)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateMessageEmbedding`](ChatStorageAdapter.md#updatemessageembedding)

***

### updateMessageError()

> **updateMessageError**(`uniqueId`: `string`, `error`: `string`): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#108)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateMessageError`](ChatStorageAdapter.md#updatemessageerror)

***

### updateMessageFeedback()

> **updateMessageFeedback**(`uniqueId`: `string`, `feedback`: [`MessageFeedback`](../type-aliases/MessageFeedback.md)): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#110)

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

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateMessageFeedback`](ChatStorageAdapter.md#updatemessagefeedback)

***

### updateMessageFileIds()?

> `optional` **updateMessageFileIds**(`uniqueId`: `string`, `fileIds`: `string`\[]): `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#122)

Replace a message's attached media ids (`fileIds`). Used to attach a
generated artifact (e.g. a rendered document PDF) to the assistant message
that produced it, after streaming. Pass the FULL desired list.

Optional so this is an additive, non-breaking interface change: only hosts
wiring document/artifact generation need it, and existing custom adapters
keep compiling without implementing it. The default
[WatermelonChatStorageAdapter](../classes/WatermelonChatStorageAdapter.md) provides it.

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

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`updateMessageFileIds`](ChatStorageAdapter.md#updatemessagefileids)

***

### upsertMessage()

> **upsertMessage**(`options`: [`CreateMessageOptions`](CreateMessageOptions.md) & `object`): `Promise`<[`StoredMessage`](StoredMessage.md)>

Defined in: [src/lib/storage/ChatBackend.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#46)

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

[`CreateMessageOptions`](CreateMessageOptions.md) & `object`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md)>

***

### upsertSummary()

> **upsertSummary**(`conversationId`: `string`, `summary`: `string`, `summarizedUpTo`: `string`, `tokenCount`: `number`): `Promise`<`StoredConversationSummary`>

Defined in: [src/lib/storage/ChatBackend.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#52)

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

***

### write()

> **write**<`T`>(`fn`: (`adapter`: [`ChatStorageAdapter`](ChatStorageAdapter.md)) => `Promise`<`T`>): `Promise`<`T`>

Defined in: [src/lib/storage/ChatStorageAdapter.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#139)

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

(`adapter`: [`ChatStorageAdapter`](ChatStorageAdapter.md)) => `Promise`<`T`>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`T`>

**Inherited from**

[`ChatStorageAdapter`](ChatStorageAdapter.md).[`write`](ChatStorageAdapter.md#write)
