# UseChatStorageOptions

Defined in: [src/expo/useChatStorage.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#199)

Options for useChatStorage hook (Expo version)

Uses the base options without React-specific features (no local chat, no tools).

## Extends

* `BaseUseChatStorageOptions`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/expo/useChatStorage.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#205)

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

***

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#311)

Automatically create a new conversation if none is set (default: true)

**Inherited from**

`BaseUseChatStorageOptions.autoCreateConversation`

***

### autoEmbedMessages?

> `optional` **autoEmbedMessages**: `boolean`

Defined in: [src/lib/db/chat/types.ts:369](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#369)

Automatically generate embeddings for messages after saving.
Enables semantic search over past conversations via searchMessages().

**Default**

```ts
true
```

**Inherited from**

`BaseUseChatStorageOptions.autoEmbedMessages`

***

### autoFlushOnKeyAvailable?

> `optional` **autoFlushOnKeyAvailable**: `boolean`

Defined in: [src/expo/useChatStorage.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#236)

Auto-flush queued operations when key becomes available.

**Default**

```ts
true
```

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#317)

Base URL for the chat API endpoint

**Inherited from**

`BaseUseChatStorageOptions.baseUrl`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#309)

ID of an existing conversation to load and continue

**Inherited from**

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:307](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#307)

WatermelonDB database instance for storing conversations and messages

**Inherited from**

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#313)

Title for auto-created conversations (default: "New conversation")

**Inherited from**

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../../../react/Internal/type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/expo/useChatStorage.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#221)

Function for silent signing with Privy embedded wallets.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:374](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#374)

Embedding model to use when autoEmbedMessages is enabled.

**Default**

```ts
DEFAULT_API_EMBEDDING_MODEL
```

**Inherited from**

`BaseUseChatStorageOptions.embeddingModel`

***

### enableQueue?

> `optional` **enableQueue**: `boolean`

Defined in: [src/expo/useChatStorage.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#231)

Enable the in-memory write queue.

**Default**

```ts
true
```

***

### fileProcessingOptions?

> `optional` **fileProcessingOptions**: `object`

Defined in: [src/lib/db/chat/types.ts:346](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#346)

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

> `optional` **fileProcessors**: [`FileProcessor`](../../../react/Internal/interfaces/FileProcessor.md)\[] | `null`

Defined in: [src/lib/db/chat/types.ts:342](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#342)

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

**Inherited from**

`BaseUseChatStorageOptions.fileProcessors`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/chat/types.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#315)

Function to retrieve the auth token for API requests

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseChatStorageOptions.getToken`

***

### getWalletAddress()?

> `optional` **getWalletAddress**: () => `Promise`<`string` | `null`>

Defined in: [src/expo/useChatStorage.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#226)

Async function to poll for wallet address during Privy initialization.

**Returns**

`Promise`<`string` | `null`>

***

### mcpR2Domain?

> `optional` **mcpR2Domain**: `string`

Defined in: [src/lib/db/chat/types.ts:386](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#386)

R2 domain for identifying MCP-generated image URLs.
When set, enables OPFS caching of generated images.
Defaults to the hardcoded MCP\_R2\_DOMAIN from clientConfig.

**Inherited from**

`BaseUseChatStorageOptions.mcpR2Domain`

***

### minContentLength?

> `optional` **minContentLength**: `number`

Defined in: [src/lib/db/chat/types.ts:380](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#380)

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

Defined in: [src/lib/db/chat/types.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#319)

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

Defined in: [src/lib/db/chat/types.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#325)

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

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#323)

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

> `optional` **onServerToolCall**: (`toolCall`: `ServerToolCallEvent`) => `void`

Defined in: [src/lib/db/chat/types.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#330)

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

`ServerToolCallEvent`

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

Defined in: [src/lib/db/chat/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#321)

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

### onToolCallArgumentsDelta()?

> `optional` **onToolCallArgumentsDelta**: (`event`: [`ToolCallArgumentsDeltaEvent`](../../../react/Internal/type-aliases/ToolCallArgumentsDeltaEvent.md)) => `void`

Defined in: [src/lib/db/chat/types.ts:335](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#335)

Called with partial tool call arguments as they stream in.
Use for live preview of artifacts (HTML, slides) being generated.

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

`event`

</td>
<td>

[`ToolCallArgumentsDeltaEvent`](../../../react/Internal/type-aliases/ToolCallArgumentsDeltaEvent.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onToolCallArgumentsDelta`

***

### serverTools?

> `optional` **serverTools**: `object`

Defined in: [src/lib/db/chat/types.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#360)

Configuration for server-side tools fetching and caching.
Server tools are fetched from /api/v1/tools and cached in localStorage.

**cacheExpirationMs?**

> `optional` **cacheExpirationMs**: `number`

Cache expiration time in milliseconds (default: 86400000 = 1 day)

**Inherited from**

`BaseUseChatStorageOptions.serverTools`

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../../../react/Internal/type-aliases/SignMessageFn.md)

Defined in: [src/expo/useChatStorage.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#216)

Function to sign a message for encryption key derivation.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/expo/useChatStorage.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#211)

Wallet address for field-level encryption.
When provided with signMessage, all sensitive content is encrypted at rest.
