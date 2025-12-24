# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L87)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

- `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`) => `Promise`\<`void`\>

Defined in: [src/lib/db/chat/types.ts:205](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L205)

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

Defined in: [src/lib/db/chat/types.ts:194](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L194)

#### Inherited from

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)\>

Defined in: [src/lib/db/chat/types.ts:196](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L196)

#### Parameters

##### options?

[`CreateConversationOptions`](../../react/interfaces/CreateConversationOptions.md)

#### Returns

`Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)\>

#### Inherited from

`BaseUseChatStorageResult.createConversation`

***

### deleteConversation()

> **deleteConversation**: (`id`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:202](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L202)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

`BaseUseChatStorageResult.deleteConversation`

***

### extractSourcesFromAssistantMessage()

> **extractSourcesFromAssistantMessage**: (`assistantMessage`) => [`SearchSource`](../../react/interfaces/SearchSource.md)[]

Defined in: [src/expo/useChatStorage.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L93)

Extract all links from assistant message content as SearchSource objects

#### Parameters

##### assistantMessage

###### content

`string`

###### sources?

[`SearchSource`](../../react/interfaces/SearchSource.md)[]

#### Returns

[`SearchSource`](../../react/interfaces/SearchSource.md)[]

***

### getConversation()

> **getConversation**: (`id`) => `Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md) \| `null`\>

Defined in: [src/lib/db/chat/types.ts:199](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L199)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md) \| `null`\>

#### Inherited from

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)[]\>

Defined in: [src/lib/db/chat/types.ts:200](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L200)

#### Returns

`Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`) => `Promise`\<`number`\>

Defined in: [src/lib/db/chat/types.ts:204](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L204)

#### Parameters

##### conversationId

`string`

#### Returns

`Promise`\<`number`\>

#### Inherited from

`BaseUseChatStorageResult.getMessageCount`

***

### getMessages()

> **getMessages**: (`conversationId`) => `Promise`\<[`StoredMessage`](../../react/interfaces/StoredMessage.md)[]\>

Defined in: [src/lib/db/chat/types.ts:203](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L203)

#### Parameters

##### conversationId

`string`

#### Returns

`Promise`\<[`StoredMessage`](../../react/interfaces/StoredMessage.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:192](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L192)

#### Inherited from

`BaseUseChatStorageResult.isLoading`

***

### sendMessage()

> **sendMessage**: (`args`) => `Promise`\<`BaseSendMessageWithStorageResult`\>

Defined in: [src/expo/useChatStorage.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L89)

Send a message and automatically store it (Expo version)

#### Parameters

##### args

`BaseSendMessageWithStorageArgs`

#### Returns

`Promise`\<`BaseSendMessageWithStorageResult`\>

***

### setConversationId()

> **setConversationId**: (`id`) => `void`

Defined in: [src/lib/db/chat/types.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L195)

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

Defined in: [src/lib/db/chat/types.ts:193](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L193)

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`, `title`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:201](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L201)

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

> **updateMessage**: (`uniqueId`, `options`) => `Promise`\<[`StoredMessage`](../../react/interfaces/StoredMessage.md) \| `null`\>

Defined in: [src/expo/useChatStorage.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L98)

Update a message's fields (content, embedding, files, etc). Returns updated message or null if not found.

#### Parameters

##### uniqueId

`string`

##### options

`UpdateMessageOptions`

#### Returns

`Promise`\<[`StoredMessage`](../../react/interfaces/StoredMessage.md) \| `null`\>
