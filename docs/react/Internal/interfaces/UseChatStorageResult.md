# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:146](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L146)

Result returned by useChatStorage hook (React version)

Extends base result with React-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearMessages()

> **clearMessages**: (`conversationId`: `string`) => `Promise`<`void`>

Defined in: [src/lib/db/chat/types.ts:240](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L240)

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

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L229)

**Inherited from**

`BaseUseChatStorageResult.conversationId`

***

### createConversation()

> **createConversation**: (`options?`: [`CreateConversationOptions`](CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](StoredConversation.md)>

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L231)

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

[`CreateConversationOptions`](CreateConversationOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)>

**Inherited from**

`BaseUseChatStorageResult.createConversation`

***

### deleteConversation()

> **deleteConversation**: (`id`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:237](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L237)

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

> **extractSourcesFromAssistantMessage**: (`assistantMessage`: `object`) => [`SearchSource`](SearchSource.md)\[]

Defined in: [src/react/useChatStorage.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L190)

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

{ `content`: `string`; `sources?`: [`SearchSource`](SearchSource.md)\[]; }

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

[`SearchSource`](SearchSource.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

[`SearchSource`](SearchSource.md)\[]

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L234)

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

`Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

**Inherited from**

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/types.ts:235](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L235)

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessageCount()

> **getMessageCount**: (`conversationId`: `string`) => `Promise`<`number`>

Defined in: [src/lib/db/chat/types.ts:239](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L239)

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

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

Defined in: [src/lib/db/chat/types.ts:238](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L238)

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

`Promise`<[`StoredMessage`](StoredMessage.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:227](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L227)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### searchMessages()

> **searchMessages**: (`queryVector`: `number`\[], `options?`: [`SearchMessagesOptions`](SearchMessagesOptions.md)) => `Promise`<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)\[]>

Defined in: [src/react/useChatStorage.ts:179](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L179)

Search messages by vector similarity

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

`queryVector`

</td>
<td>

`number`\[]

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`SearchMessagesOptions`](SearchMessagesOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)\[]>

***

### sendMessage()

> **sendMessage**: (`args`: `object`) => `Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

Defined in: [src/react/useChatStorage.ts:175](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L175)

Sends a message to the AI and automatically persists both the user message
and assistant response to the database.

This method handles the complete message lifecycle:

1. Ensures a conversation exists (creates one if `autoCreateConversation` is enabled)
2. Optionally includes conversation history for context
3. Stores the user message before sending
4. Streams the response via the underlying `useChat` hook
5. Stores the assistant response (including usage stats, sources, and thinking)
6. Handles abort/error states gracefully

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

`args`

</td>
<td>

{ `apiType?`: `ApiType`; `content`: `string`; `files?`: [`FileMetadata`](FileMetadata.md)\[]; `headers?`: `Record`<`string`, `string`>; `includeHistory?`: `boolean`; `maxHistoryMessages?`: `number`; `maxOutputTokens?`: `number`; `memoryContext?`: `string`; `messages?`: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]; `model?`: `string`; `onData?`: (`chunk`: `string`) => `void`; `onThinking?`: (`chunk`: `string`) => `void`; `previousResponseId?`: `string`; `reasoning?`: [`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md); `searchContext?`: `string`; `serverConversation?`: `string`; `sources?`: [`SearchSource`](SearchSource.md)\[]; `store?`: `boolean`; `temperature?`: `number`; `thinking?`: [`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md); `thoughtProcess?`: `ActivityPhase`\[]; `toolChoice?`: `string`; `tools?`: [`LlmapiTool`](../../../client/Internal/type-aliases/LlmapiTool.md)\[]; `writeFile?`: (`fileId`: `string`, `blob`: `Blob`, `options?`: `object`) => `Promise`<`string`>; }

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.apiType?`

</td>
<td>

`ApiType`

</td>
<td>

Override the API type for this request only.
Useful when different models need different APIs.

**Default**

```ts
Uses the hook-level apiType or "responses"
```

</td>
</tr>
<tr>
<td>

`args.content`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.files?`

</td>
<td>

[`FileMetadata`](FileMetadata.md)\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.headers?`

</td>
<td>

`Record`<`string`, `string`>

</td>
<td>

Custom headers

</td>
</tr>
<tr>
<td>

`args.includeHistory?`

</td>
<td>

`boolean`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.maxHistoryMessages?`

</td>
<td>

`number`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.maxOutputTokens?`

</td>
<td>

`number`

</td>
<td>

Maximum number of tokens to generate in the response.

</td>
</tr>
<tr>
<td>

`args.memoryContext?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.messages?`

</td>
<td>

[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.model?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.onData?`

</td>
<td>

(`chunk`: `string`) => `void`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.onThinking?`

</td>
<td>

(`chunk`: `string`) => `void`

</td>
<td>

Per-request callback for thinking/reasoning chunks.
Called with delta chunks as the model "thinks" through a problem.

</td>
</tr>
<tr>
<td>

`args.previousResponseId?`

</td>
<td>

`string`

</td>
<td>

ID of a previous response to continue from.
Enables multi-turn conversations without resending full history.

</td>
</tr>
<tr>
<td>

`args.reasoning?`

</td>
<td>

[`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md)

</td>
<td>

Reasoning configuration for o-series and other reasoning models.
Controls reasoning effort and summary output.

</td>
</tr>
<tr>
<td>

`args.searchContext?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.serverConversation?`

</td>
<td>

`string`

</td>
<td>

Conversation ID for grouping related responses on the server.

</td>
</tr>
<tr>
<td>

`args.sources?`

</td>
<td>

[`SearchSource`](SearchSource.md)\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.store?`

</td>
<td>

`boolean`

</td>
<td>

Whether to store the response server-side.
When true, the response can be retrieved later using the response ID.

</td>
</tr>
<tr>
<td>

`args.temperature?`

</td>
<td>

`number`

</td>
<td>

Controls randomness in the response (0.0 to 2.0).

</td>
</tr>
<tr>
<td>

`args.thinking?`

</td>
<td>

[`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md)

</td>
<td>

Extended thinking configuration for Anthropic models (Claude).
Enables the model to think through complex problems step by step.

</td>
</tr>
<tr>
<td>

`args.thoughtProcess?`

</td>
<td>

`ActivityPhase`\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`args.toolChoice?`

</td>
<td>

`string`

</td>
<td>

Controls which tool to use: "auto", "any", "none", "required", or a specific tool name.

</td>
</tr>
<tr>
<td>

`args.tools?`

</td>
<td>

[`LlmapiTool`](../../../client/Internal/type-aliases/LlmapiTool.md)\[]

</td>
<td>

Array of tool definitions available to the model.

</td>
</tr>
<tr>
<td>

`args.writeFile?`

</td>
<td>

(`fileId`: `string`, `blob`: `Blob`, `options?`: `object`) => `Promise`<`string`>

</td>
<td>

Function to write files to storage (for MCP image processing). Optional - if not provided, MCP images won't be processed.

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

**Example**

```ts
const result = await sendMessage({
  content: "Explain quantum computing",
  model: "gpt-4o",
  includeHistory: true,
  onData: (chunk) => setStreamingText(prev => prev + chunk),
});

if (result.error) {
  console.error("Failed:", result.error);
} else {
  console.log("Stored message ID:", result.assistantMessage.uniqueId);
}
```

***

### setConversationId()

> **setConversationId**: (`id`: `string` | `null`) => `void`

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L230)

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

Defined in: [src/lib/db/chat/types.ts:228](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L228)

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageResult.stop`

***

### updateConversationTitle()

> **updateConversationTitle**: (`id`: `string`, `title`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/chat/types.ts:236](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L236)

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

> **updateMessage**: (`uniqueId`: `string`, `options`: `UpdateMessageOptions`) => `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/react/useChatStorage.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L195)

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

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

***

### updateMessageEmbedding()

> **updateMessageEmbedding**: (`uniqueId`: `string`, `vector`: `number`\[], `embeddingModel`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/react/useChatStorage.ts:184](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L184)

Update a message's embedding vector. Returns updated message or null if not found.

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

`vector`

</td>
<td>

`number`\[]

</td>
</tr>
<tr>
<td>

`embeddingModel`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMessage`](StoredMessage.md) | `null`>
