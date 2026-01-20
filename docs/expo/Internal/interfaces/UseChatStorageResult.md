# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L109)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`: `string`) => `Promise`<`void`>

Defined in: [src/lib/db/chat/types.ts:407](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L407)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

**Inherited from**

`BaseUseChatStorageResult.clearMessages`

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/db/chat/types.ts:396](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L396)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:398](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L398)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

[`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

**Inherited from**

`BaseUseChatStorageResult.createConversation`

***

### deleteConversation()

> **deleteConversation**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:404](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L404)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

**Inherited from**

`BaseUseChatStorageResult.deleteConversation`

***

### extractSourcesFromAssistantMessage()

> **extractSourcesFromAssistantMessage**: (`assistantMessage`: `object`) => [`SearchSource`](../../../react/Internal/interfaces/SearchSource.md)\[]

Defined in: [src/expo/useChatStorage.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L115)

Extract all links from assistant message content as SearchSource objects

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`assistantMessage`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`assistantMessage.content`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`assistantMessage.sources?`

</td>
<td>

[`SearchSource`](../../../react/Internal/interfaces/SearchSource.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

[`SearchSource`](../../../react/Internal/interfaces/SearchSource.md)\[]

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:401](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L401)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

**Inherited from**

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/types.ts:402](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L402)

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`: `string`) => `Promise`<`number`>

Defined in: [src/lib/db/chat/types.ts:406](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L406)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`number`>

**Inherited from**

`BaseUseChatStorageResult.getMessageCount`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:405](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L405)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:394](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L394)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### sendMessage()

> **sendMessage**: (`args`: [`SendMessageWithStorageArgs`](../type-aliases/SendMessageWithStorageArgs.md)) => `Promise`<`BaseSendMessageWithStorageResult`>

Defined in: [src/expo/useChatStorage.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L111)

Send a message and automatically store it (Expo version)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`args`

</td>
<td>

[`SendMessageWithStorageArgs`](../type-aliases/SendMessageWithStorageArgs.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`BaseSendMessageWithStorageResult`>

***

### setConversationId()

> **setConversationId**: (`id`: `string` | `null`) => `void`

Defined in: [src/lib/db/chat/types.ts:397](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L397)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`id`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.setConversationId`

***

### stop()

> **stop**: () => `void`

Defined in: [src/lib/db/chat/types.ts:395](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L395)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`: `string`, `title`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:403](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L403)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`title`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

**Inherited from**

`BaseUseChatStorageResult.updateConversationTitle`

***

### updateMessage()

> **updateMessage**: (`uniqueId`: `string`, `options`: `UpdateMessageOptions`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md) | `null`>

Defined in: [src/expo/useChatStorage.ts:120](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L120)

Update a message's fields (content, embedding, files, etc). Returns updated message or null if not found.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`uniqueId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`UpdateMessageOptions`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md) | `null`>
