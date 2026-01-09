# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:145](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L145)

Result returned by useChatStorage hook (React version)

Extends base result with React-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`: `string`) => `Promise`<`void`>

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L231)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `conversationId` | `string` |

**Returns**

`Promise`<`void`>

**Inherited from**

`BaseUseChatStorageResult.clearMessages`

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L220)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L222)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | [`CreateConversationOptions`](CreateConversationOptions.md) |

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)>

**Inherited from**

`BaseUseChatStorageResult.createConversation`

***

### deleteConversation()

> **deleteConversation**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:228](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L228)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

**Returns**

`Promise`<`boolean`>

**Inherited from**

`BaseUseChatStorageResult.deleteConversation`

***

### extractSourcesFromAssistantMessage()

> **extractSourcesFromAssistantMessage**: (`assistantMessage`: { `content`: `string`; `sources?`: [`SearchSource`](SearchSource.md)\[]; }) => [`SearchSource`](SearchSource.md)\[]

Defined in: [src/react/useChatStorage.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L162)

Extract all links from assistant message content as SearchSource objects

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `assistantMessage` | { `content`: `string`; `sources?`: [`SearchSource`](SearchSource.md)\[]; } |
| `assistantMessage.content` | `string` |
| `assistantMessage.sources?` | [`SearchSource`](SearchSource.md)\[] |

**Returns**

[`SearchSource`](SearchSource.md)\[]

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L225)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

**Inherited from**

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/types.ts:226](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L226)

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`: `string`) => `Promise`<`number`>

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L230)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `conversationId` | `string` |

**Returns**

`Promise`<`number`>

**Inherited from**

`BaseUseChatStorageResult.getMessageCount`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L229)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `conversationId` | `string` |

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:218](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L218)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### searchMessages()

> **searchMessages**: (`queryVector`: `number`\[], `options?`: [`SearchMessagesOptions`](SearchMessagesOptions.md)) => `Promise`<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)\[]>

Defined in: [src/react/useChatStorage.ts:151](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L151)

Search messages by vector similarity

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `queryVector` | `number`\[] |
| `options?` | [`SearchMessagesOptions`](SearchMessagesOptions.md) |

**Returns**

`Promise`<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)\[]>

***

### sendMessage()

> **sendMessage**: (`args`: [`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md)) => `Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

Defined in: [src/react/useChatStorage.ts:147](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L147)

Send a message and automatically store it

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `args` | [`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md) |

**Returns**

`Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

***

### setConversationId()

> **setConversationId**: (`id`: `string` | `null`) => `void`

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L221)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `id` | `string` | `null` |

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.setConversationId`

***

### stop()

> **stop**: () => `void`

Defined in: [src/lib/db/chat/types.ts:219](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L219)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`: `string`, `title`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:227](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L227)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `title` | `string` |

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

| Parameter | Type |
| ------ | ------ |
| `uniqueId` | `string` |
| `options` | `UpdateMessageOptions` |

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

***

### updateMessageEmbedding()

> **updateMessageEmbedding**: (`uniqueId`: `string`, `vector`: `number`\[], `embeddingModel`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/react/useChatStorage.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L156)

Update a message's embedding vector. Returns updated message or null if not found.

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `uniqueId` | `string` |
| `vector` | `number`\[] |
| `embeddingModel` | `string` |

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>
