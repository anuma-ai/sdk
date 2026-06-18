# UseChatStorageResult

Defined in: [src/expo/useChatStorage.ts:386](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#386)

Result returned by useChatStorage hook (Expo version)

Extends base result with Expo-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearQueue()

> **clearQueue**: () => `void`

Defined in: [src/expo/useChatStorage.ts:477](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#477)

Clear all queued operations without writing them.

**Returns**

`void`

***

### conversationId

> **conversationId**: `string` | `null`

Defined in: [src/lib/db/chat/types.ts:806](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#806)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](../../../react/Internal/interfaces/CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:808](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#808)

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

Defined in: [src/expo/useChatStorage.ts:441](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#441)

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

Defined in: [src/expo/useChatStorage.ts:444](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#444)

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

Defined in: [src/expo/useChatStorage.ts:451](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#451)

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

Defined in: [src/lib/db/chat/types.ts:813](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#813)

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

Defined in: [src/expo/useChatStorage.ts:471](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#471)

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

### detach()

> **detach**: () => [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

Defined in: [src/expo/useChatStorage.ts:395](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#395)

Detach the in-flight stream (keep generating server-side). Resolves to the
resume handle, or null when nothing is resumable. The partial assistant row
is persisted by `sendMessage`'s detached branch — pair the handle with that
row's `assistantUniqueId` to complete it via `resumeStream`.

**Returns**

[`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

***

### flushQueue()

> **flushQueue**: () => `Promise`<[`FlushResult`](../../../react/Internal/interfaces/FlushResult.md)>

Defined in: [src/expo/useChatStorage.ts:474](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#474)

Manually flush all queued operations for the current wallet.

**Returns**

`Promise`<[`FlushResult`](../../../react/Internal/interfaces/FlushResult.md)>

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:809](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#809)

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

Defined in: [src/lib/db/chat/types.ts:810](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#810)

**Returns**

`Promise`<[`StoredConversation`](../../../react/Internal/interfaces/StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:814](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#814)

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

Defined in: [src/expo/useChatStorage.ts:468](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#468)

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

Defined in: [src/lib/db/chat/types.ts:804](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#804)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### queueStatus

> **queueStatus**: [`QueueStatus`](../../../react/Internal/interfaces/QueueStatus.md)

Defined in: [src/expo/useChatStorage.ts:480](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#480)

Current status of the write queue.

***

### recall()

> **recall**: (`query`: `string`, `options?`: [`RecallOptions`](../../../react/Internal/interfaces/RecallOptions.md)) => `Promise`<[`RecallResult`](../../../react/Internal/interfaces/RecallResult.md)>

Defined in: [src/expo/useChatStorage.ts:465](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#465)

Recall memories programmatically via the unified ranked pipeline — the
programmatic twin of [createRecallTool](#createrecalltool). Returns ranked memories
for callers that inject memory into the prompt themselves (e.g.
pre-retrieval injection) instead of exposing a tool to the LLM. Shares
the hook's warm embedding cache. Defaults to `budget: 'low'`,
`types: ['fact']`. Gracefully returns an empty result when auth is
unavailable — pre-retrieval must never crash the submit path.

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`RecallOptions`](../../../react/Internal/interfaces/RecallOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RecallResult`](../../../react/Internal/interfaces/RecallResult.md)>

***

### resumeStream()

> **resumeStream**: (`handleOverride?`: [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md), `opts?`: `object`) => `Promise`<[`ResumeStreamWithStorageResult`](ResumeStreamWithStorageResult.md)>

Defined in: [src/expo/useChatStorage.ts:421](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#421)

Replay a detached stream and reconcile the result onto the SAME assistant
row (find→update via upsertMessageOp). Never creates a second row for the
same `assistantUniqueId`.

Uses the pending-resume context stowed by the detached `sendMessage` by
default; pass `handleOverride` for a cold-launch resume (mobile PR5) where
a deserialized handle has no in-memory context (the row is then created
fresh). Replay is always from seq 0 — consumers reset accumulated streaming
text before calling.

Pass `{ headless: true }` for a cold-launch replay of a conversation that is
NOT the one on screen: the row is still reconciled + PERSISTED exactly as
normal, but NOTHING is emitted to ANY consumer callback — `onData` /
`onThinking` / `onFinish` / `onError` are all withheld (forwarded into the
inner `useChat`, which spreads `{}` in place of all four). `isLoading` is
also left untouched, so reusing the on-screen chat's hook for an off-screen
recovery can't flicker the visible loading state. A headless resume also
does NOT touch the inner hook's shared abort controller, so the visible UI's
`stop()` can't abort it and it can't clobber a concurrently-visible stream's
controller. Recovered text can't bleed into the visible chat's streaming
buffer, nor can the recovered response (onFinish) or a transient error
(onError) reach the on-screen consumer; the caller uses the returned result
instead (mobile PR5 worker).

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

`handleOverride?`

</td>
<td>

[`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md)

</td>
</tr>
<tr>
<td>

`opts?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`opts.headless?`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ResumeStreamWithStorageResult`](ResumeStreamWithStorageResult.md)>

***

### sendMessage()

> **sendMessage**: (`args`: [`SendMessageWithStorageArgs`](../type-aliases/SendMessageWithStorageArgs.md)) => `Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

Defined in: [src/expo/useChatStorage.ts:388](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#388)

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

`Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

***

### setConversationId()

> **setConversationId**: (`id`: `string` | `null`) => `void`

Defined in: [src/lib/db/chat/types.ts:807](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#807)

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

Defined in: [src/lib/db/chat/types.ts:805](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#805)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationPinned()

> **updateConversationPinned**: (`id`: `string`, `pinned`: `boolean`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:812](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#812)

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

Defined in: [src/lib/db/chat/types.ts:811](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#811)

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
