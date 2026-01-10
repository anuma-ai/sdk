# SendMessageWithStorageArgs

Defined in: src/react/useChatStorage.ts:152

Arguments for sendMessage with storage (React version)

Extends base arguments with headers and apiType support.

## Extends

* `BaseSendMessageWithStorageArgs`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: src/react/useChatStorage.ts:167

Override the API type for this specific request.

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

Useful when different models need different APIs within the same hook instance.

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: src/lib/db/chat/types.ts:225

File attachments to include with the message (images, documents, etc.).
Files with image MIME types and URLs are sent as image content parts.
File metadata is stored with the message (URLs are stripped if they're data URIs).

**Inherited from**

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`<`string`, `string`>

Defined in: src/react/useChatStorage.ts:158

Custom HTTP headers to include with the API request.
Useful for passing additional authentication, tracking, or feature flags.

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: src/lib/db/chat/types.ts:211

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

Defined in: src/lib/db/chat/types.ts:218

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

Defined in: src/lib/db/chat/types.ts:288

Maximum number of tokens to generate in the response.
Use this to limit response length and control costs.

**Inherited from**

`BaseSendMessageWithStorageArgs.maxOutputTokens`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: src/lib/db/chat/types.ts:238

Additional context from memory/RAG system to include in the request.
Typically contains retrieved relevant information from past conversations.

**Inherited from**

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: src/lib/db/chat/types.ts:197

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

Defined in: src/lib/db/chat/types.ts:203

The model identifier to use for this request (e.g., "gpt-4o", "claude-sonnet-4-20250514").
If not specified, uses the default model configured on the server.

**Inherited from**

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: src/lib/db/chat/types.ts:232

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

Defined in: src/lib/db/chat/types.ts:324

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

### previousResponseId?

> `optional` **previousResponseId**: `string`

Defined in: src/lib/db/chat/types.ts:271

ID of a previous response to continue from.
Enables multi-turn conversations without resending full history.

**Inherited from**

`BaseSendMessageWithStorageArgs.previousResponseId`

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md)

Defined in: src/lib/db/chat/types.ts:310

Reasoning configuration for o-series and other reasoning models.
Controls reasoning effort level and whether to include reasoning summary.

**Inherited from**

`BaseSendMessageWithStorageArgs.reasoning`

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: src/lib/db/chat/types.ts:244

Additional context from search results to include in the request.
Typically contains relevant information from web or document searches.

**Inherited from**

`BaseSendMessageWithStorageArgs.searchContext`

***

### serverConversation?

> `optional` **serverConversation**: `string`

Defined in: src/lib/db/chat/types.ts:276

Conversation ID for grouping related responses on the server.

**Inherited from**

`BaseSendMessageWithStorageArgs.serverConversation`

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: src/lib/db/chat/types.ts:250

Search sources to attach to the stored message for citation/reference.
These are combined with any sources extracted from the assistant's response.

**Inherited from**

`BaseSendMessageWithStorageArgs.sources`

***

### store?

> `optional` **store**: `boolean`

Defined in: src/lib/db/chat/types.ts:265

Whether to store the response server-side.
When true, the response can be retrieved later using the response ID.

**Inherited from**

`BaseSendMessageWithStorageArgs.store`

***

### temperature?

> `optional` **temperature**: `number`

Defined in: src/lib/db/chat/types.ts:282

Controls randomness in the response (0.0 to 2.0).
Lower values make output more deterministic, higher values more creative.

**Inherited from**

`BaseSendMessageWithStorageArgs.temperature`

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md)

Defined in: src/lib/db/chat/types.ts:317

Extended thinking configuration for Anthropic models (Claude).
Enables the model to think through complex problems step by step
before generating the final response.

**Inherited from**

`BaseSendMessageWithStorageArgs.thinking`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: src/lib/db/chat/types.ts:257

Activity phases for tracking the request lifecycle in the UI.
Each phase represents a step like "Searching", "Thinking", "Generating".
The final phase is automatically marked as completed when stored.

**Inherited from**

`BaseSendMessageWithStorageArgs.thoughtProcess`

***

### toolChoice?

> `optional` **toolChoice**: `string`

Defined in: src/lib/db/chat/types.ts:304

Controls which tool the model should use:

* "auto": Model decides whether to use a tool (default)
* "any": Model must use one of the provided tools
* "none": Model cannot use any tools
* "required": Model must use a tool
* Specific tool name: Model must use that specific tool

**Inherited from**

`BaseSendMessageWithStorageArgs.toolChoice`

***

### tools?

> `optional` **tools**: [`LlmapiTool`](../../../client/Internal/type-aliases/LlmapiTool.md)\[]

Defined in: src/lib/db/chat/types.ts:294

Array of tool definitions available to the model.
Tools enable the model to call functions, search, execute code, etc.

**Inherited from**

`BaseSendMessageWithStorageArgs.tools`

***

### writeFile()?

> `optional` **writeFile**: (`fileId`: `string`, `blob`: `Blob`, `options?`: `object`) => `Promise`<`string`>

Defined in: src/react/useChatStorage.ts:182

Function to write files to storage (for MCP image processing).
When provided, MCP-generated images in the response are automatically
downloaded and stored locally via this function. The content is updated
with placeholders that can be resolved to the stored files.

If not provided, MCP images remain as URLs in the response content.

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

`fileId`

</td>
<td>

`string`

</td>
<td>

Unique identifier for the file

</td>
</tr>
<tr>
<td>

`blob`

</td>
<td>

`Blob`

</td>
<td>

The file content as a Blob

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
<td>

Optional progress callback and abort signal

</td>
</tr>
<tr>
<td>

`options.onProgress?`

</td>
<td>

(`progress`: `number`) => `void`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>

Promise resolving to the stored file URL/path
