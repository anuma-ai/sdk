# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L87)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

- `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`) => `Promise`\<`void`\>

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L234)

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

Defined in: [src/lib/db/chat/types.ts:223](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L223)

#### Inherited from

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)\>

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L225)

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

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L231)

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

Defined in: [src/lib/db/chat/types.ts:228](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L228)

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

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L229)

#### Returns

`Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`) => `Promise`\<`number`\>

Defined in: [src/lib/db/chat/types.ts:233](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L233)

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

Defined in: [src/lib/db/chat/types.ts:232](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L232)

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

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L221)

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

Defined in: [src/lib/db/chat/types.ts:224](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L224)

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

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L222)

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`, `title`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L230)

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
