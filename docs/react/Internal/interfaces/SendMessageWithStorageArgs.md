# SendMessageWithStorageArgs

Defined in: [src/react/useChatStorage.ts:365](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L365)

Arguments for sendMessage with storage (React version)

Extends base arguments with headers and apiType support.

## Extends

* `BaseSendMessageWithStorageArgs`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/react/useChatStorage.ts:380](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L380)

Override the API type for this specific request.

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

Useful when different models need different APIs within the same hook instance.

***

### clientTools?

> `optional` **clientTools**: [`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]

Defined in: [src/lib/db/chat/types.ts:375](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L375)

Client-side tools with optional executors.
These tools run in the browser/app and can have JavaScript executor functions.

**Inherited from**

`BaseSendMessageWithStorageArgs.clientTools`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/react/useChatStorage.ts:388](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L388)

Explicitly specify the conversation ID to send this message to.
If provided, bypasses the automatic conversation detection/creation.
Useful when sending a message immediately after creating a conversation,
to avoid race conditions with React state updates.

***

### fileContext?

> `optional` **fileContext**: `string`

Defined in: [src/lib/db/chat/types.ts:342](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L342)

Additional context from preprocessed file attachments.
Contains extracted text from Excel, Word, PDF, and other document files.
Injected as a system message so it's available throughout the conversation.

**Inherited from**

`BaseSendMessageWithStorageArgs.fileContext`

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:316](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L316)

File attachments to include with the message (images, documents, etc.).
Files with image MIME types and URLs are sent as image content parts.
File metadata is stored with the message (URLs are stripped if they're data URIs).

**Inherited from**

`BaseSendMessageWithStorageArgs.files`

***

### headers?

> `optional` **headers**: `Record`<`string`, `string`>

Defined in: [src/react/useChatStorage.ts:371](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L371)

Custom HTTP headers to include with the API request.
Useful for passing additional authentication, tracking, or feature flags.

***

### includeHistory?

> `optional` **includeHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:302](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L302)

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

Defined in: [src/lib/db/chat/types.ts:309](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L309)

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

Defined in: [src/lib/db/chat/types.ts:369](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L369)

Maximum number of tokens to generate in the response.
Use this to limit response length and control costs.

**Inherited from**

`BaseSendMessageWithStorageArgs.maxOutputTokens`

***

### memoryContext?

> `optional` **memoryContext**: `string`

Defined in: [src/lib/db/chat/types.ts:329](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L329)

Additional context from memory/RAG system to include in the request.
Typically contains retrieved relevant information from past conversations.

**Inherited from**

`BaseSendMessageWithStorageArgs.memoryContext`

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/db/chat/types.ts:288](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L288)

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

Defined in: [src/lib/db/chat/types.ts:294](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L294)

The model identifier to use for this request (e.g., "gpt-4o", "claude-sonnet-4-20250514").
If not specified, uses the default model configured on the server.

**Inherited from**

`BaseSendMessageWithStorageArgs.model`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L323)

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

Defined in: [src/lib/db/chat/types.ts:420](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L420)

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

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](../../../client/Internal/type-aliases/LlmapiResponseReasoning.md)

Defined in: [src/lib/db/chat/types.ts:406](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L406)

Reasoning configuration for o-series and other reasoning models.
Controls reasoning effort level and whether to include reasoning summary.

**Inherited from**

`BaseSendMessageWithStorageArgs.reasoning`

***

### searchContext?

> `optional` **searchContext**: `string`

Defined in: [src/lib/db/chat/types.ts:335](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L335)

Additional context from search results to include in the request.
Typically contains relevant information from web or document searches.

**Inherited from**

`BaseSendMessageWithStorageArgs.searchContext`

***

### serverTools?

> `optional` **serverTools**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:390](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L390)

Server-side tools to include from /api/v1/tools.

* undefined: Include all server-side tools (default)
* string\[]: Include only tools with these names
* \[]: Include no server-side tools

**Example**

```ts
// Include only specific server tools
serverTools: ["generate_cloud_image", "perplexity_search"]

// Disable server tools for this request
serverTools: []
```

**Inherited from**

`BaseSendMessageWithStorageArgs.serverTools`

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:348](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L348)

Search sources to attach to the stored message for citation/reference.
These are combined with any sources extracted from the assistant's response.

**Inherited from**

`BaseSendMessageWithStorageArgs.sources`

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/lib/db/chat/types.ts:363](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L363)

Controls randomness in the response (0.0 to 2.0).
Lower values make output more deterministic, higher values more creative.

**Inherited from**

`BaseSendMessageWithStorageArgs.temperature`

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](../../../client/Internal/type-aliases/LlmapiThinkingOptions.md)

Defined in: [src/lib/db/chat/types.ts:413](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L413)

Extended thinking configuration for Anthropic models (Claude).
Enables the model to think through complex problems step by step
before generating the final response.

**Inherited from**

`BaseSendMessageWithStorageArgs.thinking`

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:355](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L355)

Activity phases for tracking the request lifecycle in the UI.
Each phase represents a step like "Searching", "Thinking", "Generating".
The final phase is automatically marked as completed when stored.

**Inherited from**

`BaseSendMessageWithStorageArgs.thoughtProcess`

***

### toolChoice?

> `optional` **toolChoice**: `string`

Defined in: [src/lib/db/chat/types.ts:400](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L400)

Controls which tool the model should use:

* "auto": Model decides whether to use a tool (default)
* "any": Model must use one of the provided tools
* "none": Model cannot use any tools
* "required": Model must use a tool
* Specific tool name: Model must use that specific tool

**Inherited from**

`BaseSendMessageWithStorageArgs.toolChoice`

***

### writeFile()?

> `optional` **writeFile**: (`fileId`: `string`, `blob`: `Blob`, `options?`: `object`) => `Promise`<`string`>

Defined in: [src/react/useChatStorage.ts:403](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L403)

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
