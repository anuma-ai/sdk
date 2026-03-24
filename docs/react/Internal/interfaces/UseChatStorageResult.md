# UseChatStorageResult

Defined in: [src/react/useChatStorage.ts:527](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#527)

Result returned by useChatStorage hook (React version)

Extends base result with React-specific sendMessage signature.

## Extends

* `BaseUseChatStorageResult`

## Properties

### clearQueue()

> **clearQueue**: () => `void`

Defined in: [src/react/useChatStorage.ts:663](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#663)

Clear all queued operations for the current wallet.
Discards pending operations without writing them.

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

> **createConversation**: (`options?`: [`CreateConversationOptions`](CreateConversationOptions.md)) => `Promise`<[`StoredConversation`](StoredConversation.md)>

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

### createMemoryEngineTool()

> **createMemoryEngineTool**: (`searchOptions?`: `Partial`<[`MemoryEngineSearchOptions`](MemoryEngineSearchOptions.md)>) => `ToolConfig`

Defined in: [src/react/useChatStorage.ts:581](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#581)

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

`Partial`<[`MemoryEngineSearchOptions`](MemoryEngineSearchOptions.md)>

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

### createMemoryVaultSearchTool()

> **createMemoryVaultSearchTool**: (`searchOptions?`: [`MemoryVaultSearchOptions`](MemoryVaultSearchOptions.md)) => `ToolConfig`

Defined in: [src/react/useChatStorage.ts:600](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#600)

Create a memory vault search tool for LLM to search vault memories
using semantic similarity. Pre-configured with vault context, auth, and
a shared embedding cache that is pre-populated on init.

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

[`MemoryVaultSearchOptions`](MemoryVaultSearchOptions.md)

</td>
<td>

Optional search configuration (limit, minSimilarity)

</td>
</tr>
</tbody>
</table>

**Returns**

`ToolConfig`

A ToolConfig that can be passed to sendMessage's clientTools

***

### createMemoryVaultTool()

> **createMemoryVaultTool**: (`options?`: [`MemoryVaultToolOptions`](MemoryVaultToolOptions.md)) => `ToolConfig`

Defined in: [src/react/useChatStorage.ts:590](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#590)

Create a memory vault tool for LLM to save/update persistent memories.
The tool is pre-configured with the hook's vault context and encryption.

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

`options?`

</td>
<td>

[`MemoryVaultToolOptions`](MemoryVaultToolOptions.md)

</td>
<td>

Optional configuration (onSave callback for confirmation)

</td>
</tr>
</tbody>
</table>

**Returns**

`ToolConfig`

A ToolConfig that can be passed to sendMessage's clientTools

***

### createVaultMemory()

> **createVaultMemory**: (`content`: `string`, `scope?`: `string`) => `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)>

Defined in: [src/react/useChatStorage.ts:633](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#633)

Create a new vault memory with the given content.

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

`content`

</td>
<td>

`string`

</td>
<td>

The memory text

</td>
</tr>
<tr>
<td>

`scope?`

</td>
<td>

`string`

</td>
<td>

Optional scope (defaults to "private")

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)>

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

Defined in: [src/react/useChatStorage.ts:650](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#650)

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

true if the memory was found and deleted

***

### flushQueue()

> **flushQueue**: () => `Promise`<[`FlushResult`](FlushResult.md)>

Defined in: [src/react/useChatStorage.ts:657](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#657)

Manually flush all queued operations for the current wallet.
Operations are encrypted and written to the database.
Requires the encryption key to be available.

**Returns**

`Promise`<[`FlushResult`](FlushResult.md)>

***

### getAllFiles()

> **getAllFiles**: (`options?`: `object`) => `Promise`<[`StoredFileWithContext`](StoredFileWithContext.md)\[]>

Defined in: [src/react/useChatStorage.ts:561](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#561)

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

`Promise`<[`StoredConversation`](StoredConversation.md) | `null`>

**Inherited from**

`BaseUseChatStorageResult.getConversation`

***

### getConversations()

> **getConversations**: () => `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/types.ts:714](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#714)

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getConversations`

***

### getMessages()

> **getMessages**: (`conversationId`: `string`) => `Promise`<[`StoredMessage`](StoredMessage.md)\[]>

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

`Promise`<[`StoredMessage`](StoredMessage.md)\[]>

**Inherited from**

`BaseUseChatStorageResult.getMessages`

***

### getVaultMemories()

> **getVaultMemories**: (`options?`: `object`) => `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

Defined in: [src/react/useChatStorage.ts:626](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#626)

Get all vault memories for context injection.
Returns non-deleted memories sorted by creation date (newest first).

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

`options?`

</td>
<td>

`object`

</td>
<td>

Optional filtering (scopes to include)

</td>
</tr>
<tr>
<td>

`options.scopes?`

</td>
<td>

`string`\[]

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/chat/types.ts:708](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#708)

**Inherited from**

`BaseUseChatStorageResult.isLoading`

***

### queueStatus

> **queueStatus**: [`QueueStatus`](QueueStatus.md)

Defined in: [src/react/useChatStorage.ts:668](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#668)

Current status of the write queue.

***

### searchVaultMemories()

> **searchVaultMemories**: (`query`: `string`, `searchOptions?`: [`MemoryVaultSearchOptions`](MemoryVaultSearchOptions.md)) => `Promise`<[`VaultSearchResult`](VaultSearchResult.md)\[]>

Defined in: [src/react/useChatStorage.ts:610](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#610)

Search vault memories programmatically using semantic similarity.
Returns structured results sorted by descending similarity.
Gracefully returns \[] when auth is unavailable.

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

`query`

</td>
<td>

`string`

</td>
<td>

Natural language search query

</td>
</tr>
<tr>
<td>

`searchOptions?`

</td>
<td>

[`MemoryVaultSearchOptions`](MemoryVaultSearchOptions.md)

</td>
<td>

Optional search configuration (limit, minSimilarity, scopes)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`VaultSearchResult`](VaultSearchResult.md)\[]>

***

### sendMessage()

> **sendMessage**: (`args`: `object`) => `Promise`<[`SendMessageWithStorageResult`](../type-aliases/SendMessageWithStorageResult.md)>

Defined in: [src/react/useChatStorage.ts:556](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#556)

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

`args.clientTools?`

</td>
<td>

[`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]

</td>
<td>

Client-side tools with optional executors.
These tools run in the browser/app and can have JavaScript executor functions.

</td>
</tr>
<tr>
<td>

`args.clientToolsFilter?`

</td>
<td>

[`ClientToolsFilterFn`](../type-aliases/ClientToolsFilterFn.md)

</td>
<td>

Dynamic filter for client-side tools based on prompt embeddings.
Receives the prompt embedding(s) (or null for short messages) and all client tools,
returns tool names to include. Tools not in the returned list are excluded from the request.

**Example**

```ts
clientToolsFilter: (embeddings, tools) => {
  if (!embeddings) return []; // Short message — no client tools
  const matches = findMatchingTools(embeddings, pseudoServerTools);
  return matches.map(m => m.tool.name);
}
```

</td>
</tr>
<tr>
<td>

`args.conversationId?`

</td>
<td>

`string`

</td>
<td>

Explicitly specify the conversation ID to send this message to.
If provided, bypasses the automatic conversation detection/creation.
Useful when sending a message immediately after creating a conversation,
to avoid race conditions with React state updates.

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

`args.getThoughtProcess?`

</td>
<td>

() => `ActivityPhase`\[]

</td>
<td>

Callback to get activity phases AFTER streaming completes.
Use this instead of `thoughtProcess` when phases are added dynamically during streaming
(e.g., via server tool call events like "Searching...", "Generating image...").

If both `thoughtProcess` and `getThoughtProcess` are provided, `getThoughtProcess` takes precedence.

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

`args.imageModel?`

</td>
<td>

`string`

</td>
<td>

User-selected image generation model for server-side enforcement.

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

`args.maxToolRounds?`

</td>
<td>

`number`

</td>
<td>

Maximum number of tool execution rounds before forcing the model to respond with text.
After this many rounds, `toolChoice` is set to `"none"` on the next continuation,
so the model produces a text answer using whatever tool results it has gathered.

**Default**

```ts
3
```

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

`args.parentMessageId?`

</td>
<td>

`string`

</td>
<td>

Parent message ID for branching (edit/regenerate). Sets on the user message.

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

`args.serverTools?`

</td>
<td>

[`ServerToolsFilter`](../type-aliases/ServerToolsFilter.md)

</td>
<td>

Server-side tools to include from /api/v1/tools.

* undefined: Include all server-side tools (default)
* string\[]: Include only tools with these names
* \[]: Include no server-side tools
* function: Dynamic filter that receives prompt embedding(s) and all tools,
  returns tool names to include. Useful for semantic tool matching.

**Example**

```ts
// Include only specific server tools
serverTools: ["generate_cloud_image", "perplexity_search"]

// Disable server tools for this request
serverTools: []

// Semantic tool matching based on prompt
serverTools: (embeddings, tools) => {
  const matches = findMatchingTools(embeddings, tools, { limit: 5 });
  return matches.map(m => m.tool.name);
}
```

</td>
</tr>
<tr>
<td>

`args.skipStorage?`

</td>
<td>

`boolean`

</td>
<td>

Skip all storage operations (conversation, messages, embeddings, media).
Use this for one-off tasks like title generation where you don't want
to pollute the database with utility messages.

When true:

* No conversation is created or required
* Messages are not stored in the database
* No embeddings are generated
* No media/files are processed for storage
* Result will not include userMessage or assistantMessage

**Default**

```ts
false
```

**Example**

```ts
// Generate a title without storing anything
const { data } = await sendMessage({
  messages: [{ role: "user", content: [{ type: "text", text: "Generate a title for: ..." }] }],
  skipStorage: true,
  includeHistory: false,
});
```

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
Note: Sources are also automatically extracted from tool\_call\_events in the response.

</td>
</tr>
<tr>
<td>

`args.summarizeHistory?`

</td>
<td>

`boolean`

</td>
<td>

Enable progressive summarization of conversation history.

When enabled, older messages are summarized into a compact text using a cheap
model, while recent messages are kept verbatim. This reduces input tokens by
50-70% for long conversations.

Requires `includeHistory` to be true (default). When `includeHistory` is false
or `summarizeHistory` is false, all history is sent verbatim (current behavior).

**Default**

```ts
false
```

</td>
</tr>
<tr>
<td>

`args.summaryMinWindowMessages?`

</td>
<td>

`number`

</td>
<td>

Minimum number of recent messages to always keep verbatim (never summarized).
Ensures the LLM always has immediate conversational context.
Even if these messages exceed the token threshold, they are kept.

**Default**

```ts
4 (2 user-assistant turns)
```

</td>
</tr>
<tr>
<td>

`args.summaryModel?`

</td>
<td>

`string`

</td>
<td>

Model to use for generating conversation summaries.
Should be a cheap, fast model since summarization is a straightforward task.

**Default**

```ts
'cerebras/qwen-3-235b-a22b-instruct-2507' ($0.60/1M input tokens)
```

</td>
</tr>
<tr>
<td>

`args.summaryTokenThreshold?`

</td>
<td>

`number`

</td>
<td>

Token threshold for conversation history before summarization triggers.

When the total token count of the cached summary + unsummarized messages
exceeds this value, older messages are summarized to fit within the budget.

How to choose a value:

* Lower (2000-3000): aggressive summarization, lowest cost, less verbatim context.
* Default (4000): balanced — keeps history under ~$0.01/message at typical pricing
  ($2.50/1M tokens). Triggers for most conversations after 5-10 turns.
* Higher (8000-16000): less frequent summarization, more context, higher cost.
  Good for code review or legal conversations needing precise recall.

The fixed overhead (system prompt + tools + memory ≈ 3,500 tokens) is NOT
included — it is additive. Total input ≈ overhead + threshold + current message.

**Default**

```ts
4000
```

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

Note: If you need activity phases that are added during streaming (e.g., server tool calls),
use `getThoughtProcess` callback instead, which captures phases AFTER streaming completes.

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

***

### updateVaultMemory()

> **updateVaultMemory**: (`id`: `string`, `content`: `string`, `scope?`: `string`) => `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

Defined in: [src/react/useChatStorage.ts:640](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#640)

Update an existing vault memory's content.

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

`id`

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

`content`

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

`scope?`

</td>
<td>

`string`

</td>
<td>

Optional new scope for the memory

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

the updated memory, or null if not found

***

### vaultEmbeddingCache

> **vaultEmbeddingCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/react/useChatStorage.ts:619](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#619)

The shared vault embedding cache. Use this to eagerly embed content
when saving vault memories (via eagerEmbedContent).
