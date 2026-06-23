# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:878](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#878)

Arguments for sendMessage with storage (React version)

Extends base arguments with headers and apiType support.

## Extends

* `BaseSendMessageWithStorageArgs`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/react/useChatStorage.ts:892](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#892)

Override the API type for this specific request.

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

Useful when different models need different APIs within the same hook instance.

***

### assistantUniqueId?

> `optional` **assistantUniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:794](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#794)

Pre-generated unique ID for the assistant response message.
When provided, the persisted assistant message will use this ID instead of
an auto-generated one. This lets the consumer show an in-flight streaming
placeholder under the same React key, avoiding an unmount/remount flash
when streaming completes and the message is loaded from the database.

**Inherited from**

`BaseSendMessageWithStorageArgs.assistantUniqueId`

***

### clientTools?

> `optional` **clientTools**: [`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]

Defined in: [src/lib/db/chat/types.ts:704](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#704)

Client-side tools with optional executors.
These tools run in the browser/app and can have JavaScript executor functions.

**Inherited from**

`BaseSendMessageWithStorageArgs.clientTools`

***

### clientToolsFilter?

> `optional` **clientToolsFilter**: [`ClientToolsFilterFn`](../type-aliases/ClientToolsFilterFn.md)

Defined in: [src/lib/db/chat/types.ts:741](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#741)

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

Defined in: [src/react/useChatStorage.ts:900](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#900)

Explicitly specify the conversation ID to send this message to.
If provided, bypasses the automatic conversation detection/creation.
Useful when sending a message immediately after creating a conversation,
to avoid race conditions with React state updates.

***

### fileContext?

> `optional` **fileContext**: `string`

Defined in: [src/lib/db/chat/types.ts:659](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#659)

Additional context from preprocessed file attachments.
Contains extracted text from Excel, Word, PDF, and other document files.
Injected as a system message so it's available throughout the conversation.

**Inherited from**

`BaseSendMessageWithStorageArgs.fileContext`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:608](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#608)

File attachments to include with the message (images, documents, etc.).
Files with image MIME types and URLs are sent as image content parts.
File metadata is stored with the message (URLs are stripped if they're data URIs).

**Inherited from**

`BaseSendMessageWithStorageArgs.files`

***

### getThoughtProcess()?

> `optional` **getThoughtProcess**: () => `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:684](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#684)

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

Defined in: [src/react/useChatStorage.ts:883](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#883)

Custom HTTP headers to include with the API request.
Useful for passing additional authentication, tracking, or feature flags.

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:775](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#775)

User-selected image generation model for server-side enforcement.

**Inherited from**

`BaseSendMessageWithStorageArgs.imageModel`

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:543](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#543)

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

Defined in: [src/lib/db/chat/types.ts:550](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#550)

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

Defined in: [src/lib/db/chat/types.ts:698](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#698)

Maximum number of tokens to generate in the response.
Use this to limit response length and control costs.

**Inherited from**

`BaseSendMessageWithStorageArgs.maxOutputTokens`

***

### maxToolRounds?

> `optional` **maxToolRounds**: `number`

Defined in: [src/lib/db/chat/types.ts:759](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#759)

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

Defined in: [src/lib/db/chat/types.ts:646](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#646)

Additional context from memory/RAG system to include in the request.
Typically contains retrieved relevant information from past conversations.

**Inherited from**

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/db/chat/types.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#503)

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

Defined in: [src/lib/db/chat/types.ts:509](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#509)

The model identifier to use for this request (e.g., "fireworks/accounts/fireworks/models/kimi-k2p5").
If not specified, uses the default model configured on the server.

**Inherited from**

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:640](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#640)

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

Defined in: [src/lib/db/chat/types.ts:782](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#782)

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

Defined in: [src/lib/db/chat/types.ts:785](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#785)

Parent message ID for branching (edit/regenerate). Sets on the user message.

**Inherited from**

`BaseSendMessageWithStorageArgs.parentMessageId`

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | `PiiRedactor`

Defined in: [src/react/useChatStorage.ts:913](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#913)

Per-request override for PII redaction. When set, takes precedence over the
hook-level `piiRedaction` for this call only — e.g. pass `false` to disable
redaction for a single message, or a `PiiRedactor` instance to use your own.

Scope: applies to this call's outbound LLM request, its embedding inputs
(tool-filtering and the stored message/chunk embeddings), and the
summarization prompt. Vault/memory tool embeddings are governed by the
hook-level redactor since the vault spans conversations. `true` resolves to
the conversation-shared redactor, matching the hook-level behavior.

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md)

Defined in: [src/lib/db/chat/types.ts:765](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#765)

Reasoning configuration for o-series and other reasoning models.
Controls reasoning effort level and whether to include reasoning summary.

**Inherited from**

`BaseSendMessageWithStorageArgs.reasoning`

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:652](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#652)

Additional context from search results to include in the request.
Typically contains relevant information from web or document searches.

**Inherited from**

`BaseSendMessageWithStorageArgs.searchContext`

***

### serverTools?

> `optional` **serverTools**: [`ServerToolsFilter`](../type-aliases/ServerToolsFilter.md)

Defined in: [src/lib/db/chat/types.ts:727](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#727)

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

Defined in: [src/lib/db/chat/types.ts:535](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#535)

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

Defined in: [src/lib/db/chat/types.ts:665](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#665)

Search sources to attach to the stored message for citation/reference.
Note: Sources are also automatically extracted from tool\_call\_events in the response.

**Inherited from**

`BaseSendMessageWithStorageArgs.sources`

***

### storedUserContent?

> `optional` **storedUserContent**: `string`

Defined in: [src/lib/db/chat/types.ts:633](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#633)

Override the text content persisted for the user message, instead of
extracting it from the last user turn of `messages`.

The wire payload (`messages`) and the stored/displayed/embedded user
message are normally the same text — the last user turn's joined text is
both sent and persisted. When the caller injects per-request context into
that turn for the model (e.g. recalled memory or a precise timestamp), the
wire needs the context but storage must NOT: otherwise the injected labels
are persisted, shown in the user's bubble, and re-fed as history every turn.

Set this to the user's actual text so the wire keeps the injected context
while the persisted user content reflects only what the user typed. This
drives everything derived from the stored user text: the DB row, the chat
bubble, the stored message embedding, AND the embedding reused for
server/client tool selection (so tool filtering keys off the typed text,
not the injected context). Files are still taken from `files` (or
extracted) independently of this override.

Pass `undefined` to fall back to extracting the last user turn's text (the
prior behavior); an empty string is a real override that persists empty
user content (matching a textless turn), NOT a request to fall back.

**Inherited from**

`BaseSendMessageWithStorageArgs.storedUserContent`

***

### summarizeHistory?

> `optional` **summarizeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:564](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#564)

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

Defined in: [src/lib/db/chat/types.ts:593](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#593)

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

Defined in: [src/lib/db/chat/types.ts:601](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#601)

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

Defined in: [src/lib/db/chat/types.ts:584](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#584)

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

Defined in: [src/lib/db/chat/types.ts:692](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#692)

Controls randomness in the response (0.0 to 2.0).
Lower values make output more deterministic, higher values more creative.

**Inherited from**

`BaseSendMessageWithStorageArgs.temperature`

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md)

Defined in: [src/lib/db/chat/types.ts:772](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#772)

Extended thinking configuration for Anthropic models (Claude).
Enables the model to think through complex problems step by step
before generating the final response.

**Inherited from**

`BaseSendMessageWithStorageArgs.thinking`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:675](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#675)

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

Defined in: [src/lib/db/chat/types.ts:751](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#751)

Controls which tool the model should use:

* "auto": Model decides whether to use a tool (default)
* "any": Model must use one of the provided tools
* "none": Model cannot use any tools
* "required": Model must use a tool
* Specific tool name: Model must use that specific tool

**Inherited from**

`BaseSendMessageWithStorageArgs.toolChoice`
