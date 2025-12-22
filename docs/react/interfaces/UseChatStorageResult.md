# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L134)

Result returned by useChatStorage hook (React version)

Extends base result with tool selection state and React-specific sendMessage signature.

## Extends

- `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`) => `Promise`\<`void`\>

Defined in: [src/lib/db/chat/types.ts:147](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L147)

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

Defined in: [src/lib/db/chat/types.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L136)

#### Inherited from

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](StoredConversation.md)\>

Defined in: [src/lib/db/chat/types.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L138)

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

Defined in: [src/lib/db/chat/types.ts:144](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L144)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

`BaseUseChatStorageResult.deleteConversation`

***

### getConversation()

> **getConversation**: (`id`) => `Promise`\<[`StoredConversation`](StoredConversation.md) \| `null`\>

Defined in: [src/lib/db/chat/types.ts:141](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L141)

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

Defined in: [src/lib/db/chat/types.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L142)

#### Returns

`Promise`\<[`StoredConversation`](StoredConversation.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`) => `Promise`\<`number`\>

Defined in: [src/lib/db/chat/types.ts:146](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L146)

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

Defined in: [src/lib/db/chat/types.ts:145](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L145)

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

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L134)

#### Inherited from

`BaseUseChatStorageResult.isLoading`

***

### isSelectingTool

> **isSelectingTool**: `boolean`

Defined in: [src/react/useChatStorage.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L136)

Whether tool selection is in progress

***

### searchMessages()

> **searchMessages**: (`queryVector`, `options?`) => `Promise`\<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)[]\>

Defined in: [src/react/useChatStorage.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L142)

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

Defined in: [src/react/useChatStorage.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L138)

Send a message and automatically store it (React version with tool support)

#### Parameters

##### args

[`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md)

#### Returns

`Promise`\<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)\>

***

### setConversationId()

> **setConversationId**: (`id`) => `void`

Defined in: [src/lib/db/chat/types.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L137)

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

Defined in: [src/lib/db/chat/types.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L135)

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`, `title`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:143](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L143)

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

### updateMessageEmbedding()

> **updateMessageEmbedding**: (`uniqueId`, `vector`, `embeddingModel`) => `Promise`\<[`StoredMessage`](StoredMessage.md) \| `null`\>

Defined in: [src/react/useChatStorage.ts:147](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L147)

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
