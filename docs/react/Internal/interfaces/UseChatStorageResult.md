# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:412](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L412)

Result returned by useChatStorage hook (React version)

Extends base result with React-specific sendMessage signature.

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

> **createConversation**: (`options?`: [`CreateConversationOptions`](CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](StoredConversation.md)>

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

> **extractSourcesFromAssistantMessage**: (`assistantMessage`: `object`) => [`SearchSource`](SearchSource.md)\[]

Defined in: [src/react/useChatStorage.ts:456](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L456)

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

[`SearchSource`](SearchSource.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

[`SearchSource`](SearchSource.md)\[]

***

### getAllFiles()

> **getAllFiles**: (`options?`: `object`) => `Promise`<[`StoredFileWithContext`](StoredFileWithContext.md)\[]>

Defined in: [src/react/useChatStorage.ts:469](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L469)

Get all files from all conversations, sorted by creation date (newest first).
Returns files with conversation context for building file browser UIs.

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

`options.conversationId?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredFileWithContext`](StoredFileWithContext.md)\[]>

***

### getConversation()

> **getConversation**: (`id`: `string`) => `Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

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

`Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

**Inherited from**

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/types.ts:402](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L402)

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

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

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

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

`Promise`<[`StoredMessage`](StoredMessage.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getMessages`

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:394](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L394)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### searchMessages()

> **searchMessages**: (`queryVector`: `number`\[], `options?`: [`SearchMessagesOptions`](SearchMessagesOptions.md)) => `Promise`<[`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)\[]>

Defined in: [src/react/useChatStorage.ts:445](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L445)

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

Defined in: [src/react/useChatStorage.ts:441](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L441)

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

`object`

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

Override the API type for this specific request.

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

Useful when different models need different APIs within the same hook instance.

</td>
</tr>
<tr>
<td>

`args.fileContext?`

</td>
<td>

`string`

</td>
<td>

Additional context from preprocessed file attachments.
Contains extracted text from Excel, Word, PDF, and other document files.
Injected as a system message so it's available throughout the conversation.

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

File attachments to include with the message (images, documents, etc.).
Files with image MIME types and URLs are sent as image content parts.
File metadata is stored with the message (URLs are stripped if they're data URIs).

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

Custom HTTP headers to include with the API request.
Useful for passing additional authentication, tracking, or feature flags.

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

Whether to automatically include previous messages from the conversation as context.
When true, fetches stored messages and prepends them to the request.
Ignored if `messages` is provided.

**Default**

```ts
true
```

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

Maximum number of historical messages to include when `includeHistory` is true.
Only the most recent N messages are included to manage context window size.

**Default**

```ts
50
```

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
Use this to limit response length and control costs.

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

Additional context from memory/RAG system to include in the request.
Typically contains retrieved relevant information from past conversations.

</td>
</tr>
<tr>
<td>

`args.messages`

</td>
<td>

[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

</td>
<td>

The message array to send to the AI.

Uses the modern array format that supports multimodal content (text, images, files).
The last user message in this array will be extracted and stored in the database.

When `includeHistory` is true (default), conversation history is prepended.
When `includeHistory` is false, only these messages are sent.

**Example**

```ts
// Simple usage
sendMessage({
  messages: [
    { role: "user", content: [{ type: "text", text: "Hello!" }] }
  ]
})

// With system prompt and history disabled
sendMessage({
  messages: [
    { role: "system", content: [{ type: "text", text: "You are helpful" }] },
    { role: "user", content: [{ type: "text", text: "Question" }] },
  ],
  includeHistory: false
})

// With images
sendMessage({
  messages: [
    { role: "user", content: [
      { type: "text", text: "What's in this image?" },
      { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
    ]}
  ]
})
```

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

The model identifier to use for this request (e.g., "gpt-4o", "claude-sonnet-4-20250514").
If not specified, uses the default model configured on the server.

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

Per-request callback invoked with each streamed response chunk.
Overrides the hook-level `onData` callback for this request only.
Use this to update UI as the response streams in.

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
Use this to display thinking progress in the UI.

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
Controls reasoning effort level and whether to include reasoning summary.

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

Additional context from search results to include in the request.
Typically contains relevant information from web or document searches.

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

Search sources to attach to the stored message for citation/reference.
These are combined with any sources extracted from the assistant's response.

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
Lower values make output more deterministic, higher values more creative.

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
Enables the model to think through complex problems step by step
before generating the final response.

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

Activity phases for tracking the request lifecycle in the UI.
Each phase represents a step like "Searching", "Thinking", "Generating".
The final phase is automatically marked as completed when stored.

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

Controls which tool the model should use:

* "auto": Model decides whether to use a tool (default)
* "any": Model must use one of the provided tools
* "none": Model cannot use any tools
* "required": Model must use a tool
* Specific tool name: Model must use that specific tool

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
Tools enable the model to call functions, search, execute code, etc.

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

Function to write files to storage (for MCP image processing).
When provided, MCP-generated images in the response are automatically
downloaded and stored locally via this function. The content is updated
with placeholders that can be resolved to the stored files.

If not provided, MCP images remain as URLs in the response content.

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

> **updateMessage**: (`uniqueId`: `string`, `options`: `UpdateMessageOptions`) => `Promise`<[`StoredMessage`](StoredMessage.md) | `null`>

Defined in: [src/react/useChatStorage.ts:461](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L461)

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

Defined in: [src/react/useChatStorage.ts:450](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L450)

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
