# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:145](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L145)

Result returned by useChatStorage hook (React version)

Extends base result with React-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`: `string`) => `Promise`<`void`>

Defined in: [src/lib/db/chat/types.ts:240](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L240)

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

`BaseUseChatStorageResult.clearMessages`

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L229)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L231)

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

**Inherited from**

`BaseUseChatStorageResult.createConversation`

***

### deleteConversation()

> **deleteConversation**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:237](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L237)

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

`id`

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

`BaseUseChatStorageResult.deleteConversation`

***

### extractSourcesFromAssistantMessage()

> **extractSourcesFromAssistantMessage**: (`assistantMessage`: `object`) => [`SearchSource`](SearchSource.md)\[]

Defined in: [src/react/useChatStorage.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L162)

Extract all links from assistant message content as SearchSource objects

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

`assistantMessage`

</td>
<td>

{ `content`: `string`; `sources?`: [`SearchSource`](SearchSource.md)\[]; }

</td>
</tr>
<tr>
<td>

`assistantMessage.content`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`assistantMessage.sources?`

</td>
<td>

[`SearchSource`](SearchSource.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

[`SearchSource`](SearchSource.md)\[]

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L234)

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

`id`

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

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/types.ts:235](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L235)

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`: `string`) => `Promise`<`number`>

Defined in: [src/lib/db/chat/types.ts:239](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L239)

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

**Inherited from**

`BaseUseChatStorageResult.getMessageCount`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:238](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L238)

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

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:227](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L227)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### searchMessages()

> **searchMessages**: (`queryVector`: `number`\[], `options?`: [`SearchMessagesOptions`](SearchMessagesOptions.md)) => `Promise`<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)\[]>

Defined in: [src/react/useChatStorage.ts:151](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L151)

Search messages by vector similarity

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

[`SearchMessagesOptions`](SearchMessagesOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)\[]>

***

### sendMessage()

> **sendMessage**: (`args`: [`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md)) => `Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

Defined in: [src/react/useChatStorage.ts:147](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L147)

Send a message and automatically store it

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

`args`

</td>
<td>

[`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

***

### setConversationId()

> **setConversationId**: (`id`: `string` | `null`) => `void`

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L230)

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

`id`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.setConversationId`

***

### stop()

> **stop**: () => `void`

Defined in: [src/lib/db/chat/types.ts:228](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L228)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`: `string`, `title`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:236](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L236)

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

`id`

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

`BaseUseChatStorageResult.updateConversationTitle`

***

### updateMessage()

> **updateMessage**: (`uniqueId`: `string`, `options`: `UpdateMessageOptions`) => `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/react/useChatStorage.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L167)

Update a message's fields (content, embedding, files, etc). Returns updated message or null if not found.

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

`options`

</td>
<td>

`UpdateMessageOptions`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

***

### updateMessageEmbedding()

> **updateMessageEmbedding**: (`uniqueId`: `string`, `vector`: `number`\[], `embeddingModel`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/react/useChatStorage.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L156)

Update a message's embedding vector. Returns updated message or null if not found.

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
