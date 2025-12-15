# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L83)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

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

> **createConversation**: (`options?`) => `Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)\>

Defined in: [src/lib/chatStorage/types.ts:238](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L238)

Create a new conversation

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

> **getConversation**: (`id`) => `Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md) \| `null`\>

Defined in: [src/lib/chatStorage/types.ts:242](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L242)

Get a conversation by ID

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

Defined in: [src/lib/chatStorage/types.ts:244](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L244)

Get all conversations (excluding soft-deleted)

#### Returns

`Promise`\<[`StoredConversation`](../../react/interfaces/StoredConversation.md)[]\>

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

> **getMessages**: (`conversationId`) => `Promise`\<[`StoredMessage`](../../react/interfaces/StoredMessage.md)[]\>

Defined in: [src/lib/chatStorage/types.ts:250](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L250)

Get messages for a conversation

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

Defined in: [src/lib/chatStorage/types.ts:230](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L230)

Whether a chat request is in progress

#### Inherited from

`BaseUseChatStorageResult.isLoading`

***

### sendMessage()

> **sendMessage**: (`args`) => `Promise`\<`BaseSendMessageWithStorageResult`\>

Defined in: [src/expo/useChatStorage.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L85)

Send a message and automatically store it (Expo version)

#### Parameters

##### args

`BaseSendMessageWithStorageArgs`

#### Returns

`Promise`\<`BaseSendMessageWithStorageResult`\>

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
