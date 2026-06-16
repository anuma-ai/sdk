# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#284)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearQueue()

> **clearQueue**: () => `void`

Defined in: [src/expo/useChatStorage.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#328)

Clear all queued operations without writing them.

**Returns**

`void`

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/db/chat/types.ts:783](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#783)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:785](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#785)

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

Defined in: [src/expo/useChatStorage.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#303)

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

Defined in: [src/expo/useChatStorage.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#306)

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

### createRecallTool()

> **createRecallTool**: (`toolOptions?`: [`RecallToolOptions`](../../../react/Internal/interfaces/RecallToolOptions.md), `callbacks?`: [`RecallToolCallbacks`](../../../react/Internal/interfaces/RecallToolCallbacks.md)) => `ToolConfig`

Defined in: [src/expo/useChatStorage.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#313)

Create the unified recall tool — single chat-completion tool that
searches both vault facts and conversation chunks via recall().
Replaces the legacy createMemoryEngineTool / vault search pair.

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

`toolOptions?`

</td>
<td>

[`RecallToolOptions`](../../../react/Internal/interfaces/RecallToolOptions.md)

</td>
</tr>
<tr>
<td>

`callbacks?`

</td>
<td>

[`RecallToolCallbacks`](../../../react/Internal/interfaces/RecallToolCallbacks.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`ToolConfig`

***

### deleteConversation()

> **deleteConversation**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:790](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#790)

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

Defined in: [src/expo/useChatStorage.ts:322](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#322)

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

Defined in: [src/expo/useChatStorage.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#325)

Manually flush all queued operations for the current wallet.

**Returns**

`Promise`<[`FlushResult`](../../../react/Internal/interfaces/FlushResult.md)>

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:786](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#786)

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

Defined in: [src/lib/db/chat/types.ts:787](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#787)

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:791](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#791)

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

Defined in: [src/expo/useChatStorage.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#319)

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

Defined in: [src/lib/db/chat/types.ts:781](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#781)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### queueStatus

> **queueStatus**: [`QueueStatus`](../../../react/Internal/interfaces/QueueStatus.md)

Defined in: [src/expo/useChatStorage.ts:331](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#331)

Current status of the write queue.

***

### sendMessage()

> **sendMessage**: (`args`: [`SendMessageWithStorageArgs`](../type-aliases/SendMessageWithStorageArgs.md)) => `Promise`<`BaseSendMessageWithStorageResult`>

Defined in: [src/expo/useChatStorage.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#286)

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

Defined in: [src/lib/db/chat/types.ts:784](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#784)

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

Defined in: [src/lib/db/chat/types.ts:782](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#782)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationPinned()

> **updateConversationPinned**: (`id`: `string`, `pinned`: `boolean`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:789](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#789)

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

`pinned`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

**Inherited from**

`BaseUseChatStorageResult.updateConversationPinned`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`: `string`, `title`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:788](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#788)

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
