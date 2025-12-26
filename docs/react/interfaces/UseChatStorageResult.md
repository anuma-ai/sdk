# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:120](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L120)

Result returned by useChatStorage hook (React version)

Extends base result with React-specific sendMessage signature.

## Extends

- `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`) => `Promise`\<`void`\>

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L222)

#### Parameters

##### conversationId

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BaseUseChatStorageResult.clearMessages`

***

### conversationId

> **conversationId**: `string` \| `null`

Defined in: [src/lib/db/chat/types.ts:211](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L211)

#### Inherited from

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](StoredConversation.md)\>

Defined in: [src/lib/db/chat/types.ts:213](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L213)

#### Parameters

##### options?

[`CreateConversationOptions`](CreateConversationOptions.md)

#### Returns

`Promise`\<[`StoredConversation`](StoredConversation.md)\>

#### Inherited from

`BaseUseChatStorageResult.createConversation`

***

### deleteConversation()

> **deleteConversation**: (`id`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:219](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L219)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

`BaseUseChatStorageResult.deleteConversation`

***

### extractSourcesFromAssistantMessage()

> **extractSourcesFromAssistantMessage**: (`assistantMessage`) => [`SearchSource`](SearchSource.md)[]

Defined in: [src/react/useChatStorage.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L137)

Extract all links from assistant message content as SearchSource objects

#### Parameters

##### assistantMessage

###### content

`string`

###### sources?

[`SearchSource`](SearchSource.md)[]

#### Returns

[`SearchSource`](SearchSource.md)[]

***

### getConversation()

> **getConversation**: (`id`) => `Promise`\<[`StoredConversation`](StoredConversation.md) \| `null`\>

Defined in: [src/lib/db/chat/types.ts:216](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L216)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`StoredConversation`](StoredConversation.md) \| `null`\>

#### Inherited from

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`\<[`StoredConversation`](StoredConversation.md)[]\>

Defined in: [src/lib/db/chat/types.ts:217](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L217)

#### Returns

`Promise`\<[`StoredConversation`](StoredConversation.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`) => `Promise`\<`number`\>

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L221)

#### Parameters

##### conversationId

`string`

#### Returns

`Promise`\<`number`\>

#### Inherited from

`BaseUseChatStorageResult.getMessageCount`

***

### getMessages()

> **getMessages**: (`conversationId`) => `Promise`\<[`StoredMessage`](StoredMessage.md)[]\>

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L220)

#### Parameters

##### conversationId

`string`

#### Returns

`Promise`\<[`StoredMessage`](StoredMessage.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L209)

#### Inherited from

`BaseUseChatStorageResult.isLoading`

***

### searchMessages()

> **searchMessages**: (`queryVector`, `options?`) => `Promise`\<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)[]\>

Defined in: [src/react/useChatStorage.ts:126](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L126)

Search messages by vector similarity

#### Parameters

##### queryVector

`number`[]

##### options?

[`SearchMessagesOptions`](SearchMessagesOptions.md)

#### Returns

`Promise`\<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)[]\>

***

### sendMessage()

> **sendMessage**: (`args`) => `Promise`\<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)\>

Defined in: [src/react/useChatStorage.ts:122](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L122)

Send a message and automatically store it

#### Parameters

##### args

[`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md)

#### Returns

`Promise`\<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)\>

***

### setConversationId()

> **setConversationId**: (`id`) => `void`

Defined in: [src/lib/db/chat/types.ts:212](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L212)

#### Parameters

##### id

`string` | `null`

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.setConversationId`

***

### stop()

> **stop**: () => `void`

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L210)

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`, `title`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:218](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L218)

#### Parameters

##### id

`string`

##### title

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

`BaseUseChatStorageResult.updateConversationTitle`

***

### updateMessage()

> **updateMessage**: (`uniqueId`, `options`) => `Promise`\<[`StoredMessage`](StoredMessage.md) \| `null`\>

Defined in: [src/react/useChatStorage.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L142)

Update a message's fields (content, embedding, files, etc). Returns updated message or null if not found.

#### Parameters

##### uniqueId

`string`

##### options

`UpdateMessageOptions`

#### Returns

`Promise`\<[`StoredMessage`](StoredMessage.md) \| `null`\>

***

### updateMessageEmbedding()

> **updateMessageEmbedding**: (`uniqueId`, `vector`, `embeddingModel`) => `Promise`\<[`StoredMessage`](StoredMessage.md) \| `null`\>

Defined in: [src/react/useChatStorage.ts:131](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L131)

Update a message's embedding vector. Returns updated message or null if not found.

#### Parameters

##### uniqueId

`string`

##### vector

`number`[]

##### embeddingModel

`string`

#### Returns

`Promise`\<[`StoredMessage`](StoredMessage.md) \| `null`\>
