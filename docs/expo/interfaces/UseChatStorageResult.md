# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L87)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

- `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`) => `Promise`\<`void`\>

Defined in: [src/lib/db/chat/types.ts:179](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L179)

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

Defined in: [src/lib/db/chat/types.ts:168](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L168)

#### Inherited from

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)\>

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L170)

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

Defined in: [src/lib/db/chat/types.ts:176](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L176)

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

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L173)

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

Defined in: [src/lib/db/chat/types.ts:174](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L174)

#### Returns

`Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)[]\>

#### Inherited from

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`) => `Promise`\<`number`\>

Defined in: [src/lib/db/chat/types.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L178)

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

Defined in: [src/lib/db/chat/types.ts:177](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L177)

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

Defined in: [src/lib/db/chat/types.ts:166](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L166)

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

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L169)

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

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L167)

#### Returns

`void`

#### Inherited from

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`, `title`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/chat/types.ts:175](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L175)

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
