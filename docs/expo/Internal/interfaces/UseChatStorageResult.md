# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L89)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

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

> **createConversation**: (`options?`: [`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L222)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `options?` | [`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md) |

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

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

> **extractSourcesFromAssistantMessage**: (`assistantMessage`: `object`) => [`SearchSource`](../../../react/Internal/interfaces/SearchSource.md)\[]

Defined in: [src/expo/useChatStorage.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L95)

Extract all links from assistant message content as SearchSource objects

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `assistantMessage` | { `content`: `string`; `sources?`: [`SearchSource`](../../../react/Internal/interfaces/SearchSource.md)\[]; } |
| `assistantMessage.content` | `string` |
| `assistantMessage.sources?` | [`SearchSource`](../../../react/Internal/interfaces/SearchSource.md)\[] |

**Returns**

[`SearchSource`](../../../react/Internal/interfaces/SearchSource.md)\[]

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L225)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

**Inherited from**

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/types.ts:226](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L226)

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

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

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L229)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `conversationId` | `string` |

**Returns**

`Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:218](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L218)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### sendMessage()

> **sendMessage**: (`args`: `BaseSendMessageWithStorageArgs`) => `Promise`<`BaseSendMessageWithStorageResult`>

Defined in: [src/expo/useChatStorage.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L91)

Send a message and automatically store it (Expo version)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `args` | `BaseSendMessageWithStorageArgs` |

**Returns**

`Promise`<`BaseSendMessageWithStorageResult`>

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

> **updateMessage**: (`uniqueId`: `string`, `options`: `UpdateMessageOptions`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md) | `null`>

Defined in: [src/expo/useChatStorage.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L100)

Update a message's fields (content, embedding, files, etc). Returns updated message or null if not found.

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `uniqueId` | `string` |
| `options` | `UpdateMessageOptions` |

**Returns**

`Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md) | `null`>
