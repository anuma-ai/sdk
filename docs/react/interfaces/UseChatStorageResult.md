# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L136)

Result returned by useChatStorage hook (React version)

Extends base result with tool selection state and React-specific sendMessage signature.

## Extends

- `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`) => `Promise`\<`void`\>

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L173)

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

Defined in: [src/lib/db/chat/types.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L162)

#### Inherited from

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](StoredConversation.md)\>

Defined in: [src/lib/db/chat/types.ts:164](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L164)

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

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L170)

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

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L167)

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

Defined in: [src/lib/db/chat/types.ts:168](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L168)

#### Returns

`Promise`\<[`StoredConversation`](StoredConversation.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`) => `Promise`\<`number`\>

Defined in: [src/lib/db/chat/types.ts:172](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L172)

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

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L171)

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

Defined in: [src/lib/db/chat/types.ts:160](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L160)

#### Inherited from

`BaseUseChatStorageResult.isLoading`

***

### isSelectingTool

> **isSelectingTool**: `boolean`

Defined in: [src/react/useChatStorage.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L138)

Whether tool selection is in progress

***

### searchMessages()

> **searchMessages**: (`queryVector`, `options?`) => `Promise`\<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)[]\>

Defined in: [src/react/useChatStorage.ts:144](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L144)

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

Defined in: [src/react/useChatStorage.ts:140](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L140)

Send a message and automatically store it (React version with tool support)

#### Parameters

##### args

[`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md)

#### Returns

`Promise`\<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)\>

***

### setConversationId()

> **setConversationId**: (`id`) => `void`

Defined in: [src/lib/db/chat/types.ts:163](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L163)

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

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L161)

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`, `title`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L169)

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

Defined in: [src/react/useChatStorage.ts:155](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L155)

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

Defined in: [src/react/useChatStorage.ts:149](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L149)

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
