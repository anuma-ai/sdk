# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#457)

Arguments for sendMessage with storage (React version)

Extends base arguments with headers and apiType support.

## Extends

* `BaseSendMessageWithStorageArgs`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/react/useChatStorage.ts:471](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#471)

Override the API type for this specific request.

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

Useful when different models need different APIs within the same hook instance.

***

### clientTools?

> `optional` **clientTools**: [`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]

Defined in: [src/lib/db/chat/types.ts:590](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#590)

Client-side tools with optional executors.
These tools run in the browser/app and can have JavaScript executor functions.

**Inherited from**

`BaseSendMessageWithStorageArgs.clientTools`

***

### clientToolsFilter?

> `optional` **clientToolsFilter**: [`ClientToolsFilterFn`](../type-aliases/ClientToolsFilterFn.md)

Defined in: [src/lib/db/chat/types.ts:627](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#627)

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

**Inherited from**

`BaseSendMessageWithStorageArgs.clientToolsFilter`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/react/useChatStorage.ts:479](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#479)

Explicitly specify the conversation ID to send this message to.
If provided, bypasses the automatic conversation detection/creation.
Useful when sending a message immediately after creating a conversation,
to avoid race conditions with React state updates.

***

### fileContext?

> `optional` **fileContext**: `string`

Defined in: [src/lib/db/chat/types.ts:545](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#545)

Additional context from preprocessed file attachments.
Contains extracted text from Excel, Word, PDF, and other document files.
Injected as a system message so it's available throughout the conversation.

**Inherited from**

`BaseSendMessageWithStorageArgs.fileContext`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:519](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#519)

File attachments to include with the message (images, documents, etc.).
Files with image MIME types and URLs are sent as image content parts.
File metadata is stored with the message (URLs are stripped if they're data URIs).

**Inherited from**

`BaseSendMessageWithStorageArgs.files`

***

### getThoughtProcess()?

> `optional` **getThoughtProcess**: () => `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:570](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#570)

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

Defined in: [src/react/useChatStorage.ts:462](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#462)

Custom HTTP headers to include with the API request.
Useful for passing additional authentication, tracking, or feature flags.

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:661](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#661)

User-selected image generation model for server-side enforcement.

**Inherited from**

`BaseSendMessageWithStorageArgs.imageModel`

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:454](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#454)

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

Defined in: [src/lib/db/chat/types.ts:461](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#461)

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

Defined in: [src/lib/db/chat/types.ts:584](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#584)

Maximum number of tokens to generate in the response.
Use this to limit response length and control costs.

**Inherited from**

`BaseSendMessageWithStorageArgs.maxOutputTokens`

***

### maxToolRounds?

> `optional` **maxToolRounds**: `number`

Defined in: [src/lib/db/chat/types.ts:645](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#645)

Maximum number of tool execution rounds before forcing the model to respond with text.
After this many rounds, `toolChoice` is set to `"none"` on the next continuation,
so the model produces a text answer using whatever tool results it has gathered.

**Default**

```ts
3
```

**Inherited from**

`BaseSendMessageWithStorageArgs.maxToolRounds`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:532](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#532)

Additional context from memory/RAG system to include in the request.
Typically contains retrieved relevant information from past conversations.

**Inherited from**

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/db/chat/types.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#414)

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

Defined in: [src/lib/db/chat/types.ts:420](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#420)

The model identifier to use for this request (e.g., "gpt-4o", "claude-sonnet-4-20250514").
If not specified, uses the default model configured on the server.

**Inherited from**

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:526](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#526)

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

Defined in: [src/lib/db/chat/types.ts:668](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#668)

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

Defined in: [src/lib/db/chat/types.ts:671](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#671)

Parent message ID for branching (edit/regenerate). Sets on the user message.

**Inherited from**

`BaseSendMessageWithStorageArgs.parentMessageId`

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md)

Defined in: [src/lib/db/chat/types.ts:651](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#651)

Reasoning configuration for o-series and other reasoning models.
Controls reasoning effort level and whether to include reasoning summary.

**Inherited from**

`BaseSendMessageWithStorageArgs.reasoning`

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:538](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#538)

Additional context from search results to include in the request.
Typically contains relevant information from web or document searches.

**Inherited from**

`BaseSendMessageWithStorageArgs.searchContext`

***

### serverTools?

> `optional` **serverTools**: [`ServerToolsFilter`](../type-aliases/ServerToolsFilter.md)

Defined in: [src/lib/db/chat/types.ts:613](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#613)

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

Defined in: [src/lib/db/chat/types.ts:446](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#446)

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

Defined in: [src/lib/db/chat/types.ts:551](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#551)

Search sources to attach to the stored message for citation/reference.
Note: Sources are also automatically extracted from tool\_call\_events in the response.

**Inherited from**

`BaseSendMessageWithStorageArgs.sources`

***

### summarizeHistory?

> `optional` **summarizeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:475](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#475)

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

**Inherited from**

`BaseSendMessageWithStorageArgs.summarizeHistory`

***

### summaryMinWindowMessages?

> `optional` **summaryMinWindowMessages**: `number`

Defined in: [src/lib/db/chat/types.ts:504](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#504)

Minimum number of recent messages to always keep verbatim (never summarized).
Ensures the LLM always has immediate conversational context.
Even if these messages exceed the token threshold, they are kept.

**Default**

```ts
4 (2 user-assistant turns)
```

**Inherited from**

`BaseSendMessageWithStorageArgs.summaryMinWindowMessages`

***

### summaryModel?

> `optional` **summaryModel**: `string`

Defined in: [src/lib/db/chat/types.ts:512](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#512)

Model to use for generating conversation summaries.
Should be a cheap, fast model since summarization is a straightforward task.

**Default**

```ts
'cerebras/qwen-3-235b-a22b-instruct-2507' ($0.60/1M input tokens)
```

**Inherited from**

`BaseSendMessageWithStorageArgs.summaryModel`

***

### summaryTokenThreshold?

> `optional` **summaryTokenThreshold**: `number`

Defined in: [src/lib/db/chat/types.ts:495](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#495)

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

**Inherited from**

`BaseSendMessageWithStorageArgs.summaryTokenThreshold`

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/lib/db/chat/types.ts:578](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#578)

Controls randomness in the response (0.0 to 2.0).
Lower values make output more deterministic, higher values more creative.

**Inherited from**

`BaseSendMessageWithStorageArgs.temperature`

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md)

Defined in: [src/lib/db/chat/types.ts:658](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#658)

Extended thinking configuration for Anthropic models (Claude).
Enables the model to think through complex problems step by step
before generating the final response.

**Inherited from**

`BaseSendMessageWithStorageArgs.thinking`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:561](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#561)

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

Defined in: [src/lib/db/chat/types.ts:637](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#637)

Controls which tool the model should use:

* "auto": Model decides whether to use a tool (default)
* "any": Model must use one of the provided tools
* "none": Model cannot use any tools
* "required": Model must use a tool
* Specific tool name: Model must use that specific tool

**Inherited from**

`BaseSendMessageWithStorageArgs.toolChoice`
