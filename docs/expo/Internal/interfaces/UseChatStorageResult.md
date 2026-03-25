# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#201)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearQueue()

> **clearQueue**: () => `void`

Defined in: [src/expo/useChatStorage.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#235)

Clear all queued operations without writing them.

**Returns**

`void`

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/db/chat/types.ts:710](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#710)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:712](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#712)

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

### createMemoryEngineTool()

> **createMemoryEngineTool**: (`searchOptions?`: `Partial`<[`MemoryEngineSearchOptions`](../../../react/Internal/interfaces/MemoryEngineSearchOptions.md)>) => `ToolConfig`

Defined in: [src/expo/useChatStorage.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#220)

Create a memory engine tool for LLM to search past conversations.
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

`Partial`<[`MemoryEngineSearchOptions`](../../../react/Internal/interfaces/MemoryEngineSearchOptions.md)>

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
const memoryTool = createMemoryEngineTool({ limit: 5 });
await sendMessage({
  messages: [...],
  clientTools: [memoryTool],
});
```

***

### createMemoryVaultTool()

> **createMemoryVaultTool**: (`options?`: [`MemoryVaultToolOptions`](../../../react/Internal/interfaces/MemoryVaultToolOptions.md)) => `ToolConfig`

Defined in: [src/expo/useChatStorage.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#223)

Create a memory vault tool pre-configured with hook's vault context and encryption.

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

[`MemoryVaultToolOptions`](../../../react/Internal/interfaces/MemoryVaultToolOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`ToolConfig`

***

### deleteConversation()

> **deleteConversation**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:716](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#716)

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

### deleteVaultMemory()

> **deleteVaultMemory**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/expo/useChatStorage.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#229)

Delete a vault memory by its ID (soft delete).

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

***

### flushQueue()

> **flushQueue**: () => `Promise`<[`FlushResult`](../../../react/Internal/interfaces/FlushResult.md)>

Defined in: [src/expo/useChatStorage.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#232)

Manually flush all queued operations for the current wallet.

**Returns**

`Promise`<[`FlushResult`](../../../react/Internal/interfaces/FlushResult.md)>

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:713](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#713)

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

Defined in: [src/lib/db/chat/types.ts:714](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#714)

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:717](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#717)

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

### getVaultMemories()

> **getVaultMemories**: (`options?`: `object`) => `Promise`<[`StoredVaultMemory`](../../../react/Internal/interfaces/StoredVaultMemory.md)\[]>

Defined in: [src/expo/useChatStorage.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#226)

Get all vault memories for context injection.

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

`object`

</td>
</tr>
<tr>
<td>

`options.scopes?`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](../../../react/Internal/interfaces/StoredVaultMemory.md)\[]>

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:708](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#708)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### queueStatus

> **queueStatus**: [`QueueStatus`](../../../react/Internal/interfaces/QueueStatus.md)

Defined in: [src/expo/useChatStorage.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#238)

Current status of the write queue.

***

### sendMessage()

> **sendMessage**: (`args`: [`SendMessageWithStorageArgs`](../type-aliases/SendMessageWithStorageArgs.md)) => `Promise`<`BaseSendMessageWithStorageResult`>

Defined in: [src/expo/useChatStorage.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#203)

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

Defined in: [src/lib/db/chat/types.ts:711](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#711)

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

Defined in: [src/lib/db/chat/types.ts:709](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#709)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`: `string`, `title`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:715](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#715)

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
