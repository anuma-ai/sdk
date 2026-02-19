# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:340](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L340)

Arguments for sendMessage with storage (React version)

Extends base arguments with headers and apiType support.

## Extends

* `BaseSendMessageWithStorageArgs`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/react/useChatStorage.ts:355](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L355)

Override the API type for this specific request.

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

Useful when different models need different APIs within the same hook instance.

***

### clientTools?

> `optional` **clientTools**: [`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]

Defined in: [src/lib/db/chat/types.ts:490](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L490)

Client-side tools with optional executors.
These tools run in the browser/app and can have JavaScript executor functions.

**Inherited from**

`BaseSendMessageWithStorageArgs.clientTools`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/react/useChatStorage.ts:363](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L363)

Explicitly specify the conversation ID to send this message to.
If provided, bypasses the automatic conversation detection/creation.
Useful when sending a message immediately after creating a conversation,
to avoid race conditions with React state updates.

***

### fileContext?

> `optional` **fileContext**: `string`

Defined in: [src/lib/db/chat/types.ts:445](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L445)

Additional context from preprocessed file attachments.
Contains extracted text from Excel, Word, PDF, and other document files.
Injected as a system message so it's available throughout the conversation.

**Inherited from**

`BaseSendMessageWithStorageArgs.fileContext`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:419](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L419)

File attachments to include with the message (images, documents, etc.).
Files with image MIME types and URLs are sent as image content parts.
File metadata is stored with the message (URLs are stripped if they're data URIs).

**Inherited from**

`BaseSendMessageWithStorageArgs.files`

***

### getThoughtProcess()?

> `optional` **getThoughtProcess**: () => `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:470](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L470)

Callback to get activity phases AFTER streaming completes.
Use this instead of `thoughtProcess` when phases are added dynamically during streaming
(e.g., via server tool call events like "Searching...", "Generating image...").

If both `thoughtProcess` and `getThoughtProcess` are provided, `getThoughtProcess` takes precedence.

**Returns**

`ActivityPhase`\[]

**Inherited from**

`BaseSendMessageWithStorageArgs.getThoughtProcess`

***

### headers?

> `optional` **headers**: `Record`<`string`, `string`>

Defined in: [src/react/useChatStorage.ts:346](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L346)

Custom HTTP headers to include with the API request.
Useful for passing additional authentication, tracking, or feature flags.

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:539](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L539)

User-selected image generation model for server-side enforcement.

**Inherited from**

`BaseSendMessageWithStorageArgs.imageModel`

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:405](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L405)

Whether to automatically include previous messages from the conversation as context.
When true, fetches stored messages and prepends them to the request.
Ignored if `messages` is provided.

**Default**

```ts
true
```

**Inherited from**

`BaseSendMessageWithStorageArgs.includeHistory`

***

### maxHistoryMessages?

> `optional` **maxHistoryMessages**: `number`

Defined in: [src/lib/db/chat/types.ts:412](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L412)

Maximum number of historical messages to include when `includeHistory` is true.
Only the most recent N messages are included to manage context window size.

**Default**

```ts
50
```

**Inherited from**

`BaseSendMessageWithStorageArgs.maxHistoryMessages`

***

### maxOutputTokens?

> `optional` **maxOutputTokens**: `number`

Defined in: [src/lib/db/chat/types.ts:484](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L484)

Maximum number of tokens to generate in the response.
Use this to limit response length and control costs.

**Inherited from**

`BaseSendMessageWithStorageArgs.maxOutputTokens`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:432](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L432)

Additional context from memory/RAG system to include in the request.
Typically contains retrieved relevant information from past conversations.

**Inherited from**

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/db/chat/types.ts:365](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L365)

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

**Inherited from**

`BaseSendMessageWithStorageArgs.messages`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:371](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L371)

The model identifier to use for this request (e.g., "gpt-4o", "claude-sonnet-4-20250514").
If not specified, uses the default model configured on the server.

**Inherited from**

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:426](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L426)

Per-request callback invoked with each streamed response chunk.
Overrides the hook-level `onData` callback for this request only.
Use this to update UI as the response streams in.

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

`chunk`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseSendMessageWithStorageArgs.onData`

***

### onThinking()?

> `optional` **onThinking**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:546](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L546)

Per-request callback for thinking/reasoning chunks.
Called with delta chunks as the model "thinks" through a problem.
Use this to display thinking progress in the UI.

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

`chunk`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseSendMessageWithStorageArgs.onThinking`

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:549](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L549)

Parent message ID for branching (edit/regenerate). Sets on the user message.

**Inherited from**

`BaseSendMessageWithStorageArgs.parentMessageId`

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md)

Defined in: [src/lib/db/chat/types.ts:529](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L529)

Reasoning configuration for o-series and other reasoning models.
Controls reasoning effort level and whether to include reasoning summary.

**Inherited from**

`BaseSendMessageWithStorageArgs.reasoning`

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:438](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L438)

Additional context from search results to include in the request.
Typically contains relevant information from web or document searches.

**Inherited from**

`BaseSendMessageWithStorageArgs.searchContext`

***

### serverTools?

> `optional` **serverTools**: [`ServerToolsFilter`](../type-aliases/ServerToolsFilter.md)

Defined in: [src/lib/db/chat/types.ts:513](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L513)

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

**Inherited from**

`BaseSendMessageWithStorageArgs.serverTools`

***

### skipStorage?

> `optional` **skipStorage**: `boolean`

Defined in: [src/lib/db/chat/types.ts:397](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L397)

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

**Inherited from**

`BaseSendMessageWithStorageArgs.skipStorage`

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:451](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L451)

Search sources to attach to the stored message for citation/reference.
Note: Sources are also automatically extracted from tool\_call\_events in the response.

**Inherited from**

`BaseSendMessageWithStorageArgs.sources`

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/lib/db/chat/types.ts:478](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L478)

Controls randomness in the response (0.0 to 2.0).
Lower values make output more deterministic, higher values more creative.

**Inherited from**

`BaseSendMessageWithStorageArgs.temperature`

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md)

Defined in: [src/lib/db/chat/types.ts:536](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L536)

Extended thinking configuration for Anthropic models (Claude).
Enables the model to think through complex problems step by step
before generating the final response.

**Inherited from**

`BaseSendMessageWithStorageArgs.thinking`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:461](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L461)

Activity phases for tracking the request lifecycle in the UI.
Each phase represents a step like "Searching", "Thinking", "Generating".
The final phase is automatically marked as completed when stored.

Note: If you need activity phases that are added during streaming (e.g., server tool calls),
use `getThoughtProcess` callback instead, which captures phases AFTER streaming completes.

**Inherited from**

`BaseSendMessageWithStorageArgs.thoughtProcess`

***

### toolChoice?

> `optional` **toolChoice**: `string`

Defined in: [src/lib/db/chat/types.ts:523](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L523)

Controls which tool the model should use:

* "auto": Model decides whether to use a tool (default)
* "any": Model must use one of the provided tools
* "none": Model cannot use any tools
* "required": Model must use a tool
* Specific tool name: Model must use that specific tool

**Inherited from**

`BaseSendMessageWithStorageArgs.toolChoice`
