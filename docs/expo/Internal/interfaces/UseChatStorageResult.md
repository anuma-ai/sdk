# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L123)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/db/chat/types.ts:508](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L508)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:510](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L510)

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

### createMemoryRetrievalTool()

> **createMemoryRetrievalTool**: (`searchOptions?`: `Partial`<[`MemoryRetrievalSearchOptions`](../../../react/Internal/interfaces/MemoryRetrievalSearchOptions.md)>) => `ToolConfig`

Defined in: [src/expo/useChatStorage.ts:144](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L144)

Create a memory retrieval tool for LLM to search past conversations.
The tool is pre-configured with the hook's storage context and auth.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`searchOptions?`

</td>
<td>

`Partial`<[`MemoryRetrievalSearchOptions`](../../../react/Internal/interfaces/MemoryRetrievalSearchOptions.md)>

</td>
<td>

Optional search configuration (limit, minSimilarity, etc.)

</td>
</tr>
</tbody>
</table>

**Returns**

`ToolConfig`

A ToolConfig that can be passed to sendMessage's clientTools

**Example**

```ts
const memoryTool = createMemoryRetrievalTool({ limit: 5 });
await sendMessage({
  messages: [...],
  clientTools: [memoryTool],
});
```

***

### deleteConversation()

> **deleteConversation**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:516](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L516)

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

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:513](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L513)

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

Defined in: [src/lib/db/chat/types.ts:514](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L514)

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:517](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L517)

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

Defined in: [src/lib/db/chat/types.ts:506](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L506)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### sendMessage()

> **sendMessage**: (`args`: [`SendMessageWithStorageArgs`](../type-aliases/SendMessageWithStorageArgs.md)) => `Promise`<`BaseSendMessageWithStorageResult`>

Defined in: [src/expo/useChatStorage.ts:125](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L125)

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

Defined in: [src/lib/db/chat/types.ts:509](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L509)

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

Defined in: [src/lib/db/chat/types.ts:507](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L507)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`: `string`, `title`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:515](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L515)

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
