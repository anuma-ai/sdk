# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L130)

Result returned by useChatStorage hook (React version)

Extends base result with tool selection state and React-specific sendMessage signature.

## Extends

- `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`) => `Promise`\<`void`\>

Defined in: [src/lib/chatStorage/types.ts:254](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L254)

Clear all messages in a conversation

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

Defined in: [src/lib/chatStorage/types.ts:234](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L234)

Current conversation ID

#### Inherited from

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](StoredConversation.md)\>

Defined in: [src/lib/chatStorage/types.ts:238](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L238)

Create a new conversation

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

Defined in: [src/lib/chatStorage/types.ts:248](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L248)

Soft delete a conversation. Returns true if deleted, false if not found.

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

Defined in: [src/lib/chatStorage/types.ts:242](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L242)

Get a conversation by ID

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

Defined in: [src/lib/chatStorage/types.ts:244](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L244)

Get all conversations (excluding soft-deleted)

#### Returns

`Promise`\<[`StoredConversation`](StoredConversation.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`) => `Promise`\<`number`\>

Defined in: [src/lib/chatStorage/types.ts:252](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L252)

Get message count for a conversation

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

Defined in: [src/lib/chatStorage/types.ts:250](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L250)

Get messages for a conversation

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

Defined in: [src/lib/chatStorage/types.ts:230](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L230)

Whether a chat request is in progress

#### Inherited from

`BaseUseChatStorageResult.isLoading`

***

### isSelectingTool

> **isSelectingTool**: `boolean`

Defined in: [src/react/useChatStorage.ts:132](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L132)

Whether tool selection is in progress

***

### searchMessages()

> **searchMessages**: (`queryVector`, `options?`) => `Promise`\<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)[]\>

Defined in: [src/react/useChatStorage.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L138)

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

Defined in: [src/react/useChatStorage.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L134)

Send a message and automatically store it (React version with tool support)

#### Parameters

##### args

[`SendMessageWithStorageArgs`](SendMessageWithStorageArgs.md)

#### Returns

`Promise`\<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)\>

***

### setConversationId()

> **setConversationId**: (`id`) => `void`

Defined in: [src/lib/chatStorage/types.ts:236](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L236)

Set the current conversation ID

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

Defined in: [src/lib/chatStorage/types.ts:232](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L232)

Stop the current request

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`, `title`) => `Promise`\<`boolean`\>

Defined in: [src/lib/chatStorage/types.ts:246](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L246)

Update conversation title. Returns true if updated, false if not found.

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

Defined in: [src/react/useChatStorage.ts:143](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L143)

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
