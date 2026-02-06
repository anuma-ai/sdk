# UseChatStorageOptions

Defined in: [src/expo/useChatStorage.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L88)

Options for useChatStorage hook (Expo version)

Uses the base options without React-specific features (no local chat, no tools).

## Extends

* `BaseUseChatStorageOptions`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/expo/useChatStorage.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L94)

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

***

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:235](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L235)

Automatically create a new conversation if none is set (default: true)

**Inherited from**

`BaseUseChatStorageOptions.autoCreateConversation`

***

### autoEmbedMessages?

> `optional` **autoEmbedMessages**: `boolean`

Defined in: [src/lib/db/chat/types.ts:292](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L292)

Automatically generate embeddings for messages after saving.
Enables semantic search over past conversations via searchMessages().

**Default**

```ts
true
```

**Inherited from**

`BaseUseChatStorageOptions.autoEmbedMessages`

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:241](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L241)

Base URL for the chat API endpoint

**Inherited from**

`BaseUseChatStorageOptions.baseUrl`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:233](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L233)

ID of an existing conversation to load and continue

**Inherited from**

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L231)

WatermelonDB database instance for storing conversations and messages

**Inherited from**

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:237](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L237)

Title for auto-created conversations (default: "New conversation")

**Inherited from**

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:297](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L297)

Embedding model to use when autoEmbedMessages is enabled.

**Default**

```ts
DEFAULT_API_EMBEDDING_MODEL
```

**Inherited from**

`BaseUseChatStorageOptions.embeddingModel`

***

### fileProcessingOptions?

> `optional` **fileProcessingOptions**: `object`

Defined in: [src/lib/db/chat/types.ts:269](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L269)

Options for file preprocessing behavior

**keepOriginalFiles?**

> `optional` **keepOriginalFiles**: `boolean`

Whether to keep original file attachments (default: true)

**maxFileSizeBytes?**

> `optional` **maxFileSizeBytes**: `number`

Max file size to process in bytes (default: 10MB)

**onError()?**

> `optional` **onError**: (`fileName`: `string`, `error`: `Error`) => `void`

Callback for errors (non-fatal)

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

`fileName`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**onProgress()?**

> `optional` **onProgress**: (`current`: `number`, `total`: `number`, `fileName`: `string`) => `void`

Callback for progress updates

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

`current`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`total`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`fileName`

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

`BaseUseChatStorageOptions.fileProcessingOptions`

***

### fileProcessors?

> `optional` **fileProcessors**: `any`\[] | `null`

Defined in: [src/lib/db/chat/types.ts:265](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L265)

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

**Inherited from**

`BaseUseChatStorageOptions.fileProcessors`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/chat/types.ts:239](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L239)

Function to retrieve the auth token for API requests

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseChatStorageOptions.getToken`

***

### minContentLength?

> `optional` **minContentLength**: `number`

Defined in: [src/lib/db/chat/types.ts:303](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L303)

Minimum content length required to generate embeddings.
Messages shorter than this are skipped as they provide limited semantic value.

**Default**

```ts
10
```

**Inherited from**

`BaseUseChatStorageOptions.minContentLength`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:243](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L243)

Callback invoked with each streamed response chunk

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

`BaseUseChatStorageOptions.onData`

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/lib/db/chat/types.ts:249](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L249)

Callback invoked when an error occurs during the request

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

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onError`

***

### onFinish()?

> `optional` **onFinish**: (`response`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void`

Defined in: [src/lib/db/chat/types.ts:247](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L247)

Callback invoked when the response completes successfully

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

`response`

</td>
<td>

[`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onFinish`

***

### onServerToolCall()?

> `optional` **onServerToolCall**: (`toolCall`: `object`) => `void`

Defined in: [src/lib/db/chat/types.ts:254](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L254)

Callback invoked when a server-side tool (MCP) is called during streaming.
Use this to show activity indicators like "Searching..." in the UI.

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

`toolCall`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`toolCall.arguments?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`toolCall.name`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`toolCall.status`

</td>
<td>

`"started"` | `"completed"`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onServerToolCall`

***

### onThinking()?

> `optional` **onThinking**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:245](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L245)

Callback invoked when thinking/reasoning content is received (from `<think>` tags or API reasoning)

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

`BaseUseChatStorageOptions.onThinking`

***

### serverTools?

> `optional` **serverTools**: `object`

Defined in: [src/lib/db/chat/types.ts:283](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L283)

Configuration for server-side tools fetching and caching.
Server tools are fetched from /api/v1/tools and cached in localStorage.

**cacheExpirationMs?**

> `optional` **cacheExpirationMs**: `number`

Cache expiration time in milliseconds (default: 86400000 = 1 day)

**Inherited from**

`BaseUseChatStorageOptions.serverTools`
