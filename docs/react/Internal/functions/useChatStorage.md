# useChatStorage

> **useChatStorage**(`options`: `object`): [`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)

Defined in: [src/react/useChatStorage.ts:451](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L451)

## Parameters

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

`options`

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

`options.apiType?`

</td>
<td>

`ApiType`

</td>
<td>

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

</td>
</tr>
<tr>
<td>

`options.autoCreateConversation?`

</td>
<td>

`boolean`

</td>
<td>

Automatically create a new conversation if none is set (default: true)

</td>
</tr>
<tr>
<td>

`options.autoEmbedMessages?`

</td>
<td>

`boolean`

</td>
<td>

Automatically generate embeddings for messages after saving.
Enables semantic search over past conversations via searchMessages().

**Default**

```ts
true
```

</td>
</tr>
<tr>
<td>

`options.baseUrl?`

</td>
<td>

`string`

</td>
<td>

Base URL for the chat API endpoint

</td>
</tr>
<tr>
<td>

`options.conversationId?`

</td>
<td>

`string`

</td>
<td>

ID of an existing conversation to load and continue

</td>
</tr>
<tr>
<td>

`options.database`

</td>
<td>

`Database`

</td>
<td>

WatermelonDB database instance for storing conversations and messages

</td>
</tr>
<tr>
<td>

`options.defaultConversationTitle?`

</td>
<td>

`string`

</td>
<td>

Title for auto-created conversations (default: "New conversation")

</td>
</tr>
<tr>
<td>

`options.embeddingModel?`

</td>
<td>

`string`

</td>
<td>

Embedding model to use when autoEmbedMessages is enabled.

**Default**

```ts
DEFAULT_API_EMBEDDING_MODEL
```

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions?`

</td>
<td>

{ `keepOriginalFiles?`: `boolean`; `maxFileSizeBytes?`: `number`; `onError?`: (`fileName`: `string`, `error`: `Error`) => `void`; `onProgress?`: (`current`: `number`, `total`: `number`, `fileName`: `string`) => `void`; }

</td>
<td>

Options for file preprocessing behavior

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.keepOriginalFiles?`

</td>
<td>

`boolean`

</td>
<td>

Whether to keep original file attachments (default: true)

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.maxFileSizeBytes?`

</td>
<td>

`number`

</td>
<td>

Max file size to process in bytes (default: 10MB)

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.onError?`

</td>
<td>

(`fileName`: `string`, `error`: `Error`) => `void`

</td>
<td>

Callback for errors (non-fatal)

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.onProgress?`

</td>
<td>

(`current`: `number`, `total`: `number`, `fileName`: `string`) => `void`

</td>
<td>

Callback for progress updates

</td>
</tr>
<tr>
<td>

`options.fileProcessors?`

</td>
<td>

`any`\[] | `null`

</td>
<td>

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

</td>
</tr>
<tr>
<td>

`options.getToken?`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

Function to retrieve the auth token for API requests

</td>
</tr>
<tr>
<td>

`options.minContentLength?`

</td>
<td>

`number`

</td>
<td>

Minimum content length required to generate embeddings.
Messages shorter than this are skipped as they provide limited semantic value.

**Default**

```ts
10
```

</td>
</tr>
<tr>
<td>

`options.onData?`

</td>
<td>

(`chunk`: `string`) => `void`

</td>
<td>

Callback invoked with each streamed response chunk

</td>
</tr>
<tr>
<td>

`options.onError?`

</td>
<td>

(`error`: `Error`) => `void`

</td>
<td>

Callback invoked when an error occurs during the request

</td>
</tr>
<tr>
<td>

`options.onFinish?`

</td>
<td>

(`response`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void`

</td>
<td>

Callback invoked when the response completes successfully

</td>
</tr>
<tr>
<td>

`options.onThinking?`

</td>
<td>

(`chunk`: `string`) => `void`

</td>
<td>

Callback invoked when thinking/reasoning content is received (from `<think>` tags or API reasoning)

</td>
</tr>
<tr>
<td>

`options.serverTools?`

</td>
<td>

{ `cacheExpirationMs?`: `number`; }

</td>
<td>

Configuration for server-side tools fetching and caching.
Server tools are fetched from /api/v1/tools and cached in localStorage.

</td>
</tr>
<tr>
<td>

`options.serverTools.cacheExpirationMs?`

</td>
<td>

`number`

</td>
<td>

Cache expiration time in milliseconds (default: 86400000 = 1 day)

</td>
</tr>
<tr>
<td>

`options.walletAddress?`

</td>
<td>

`string`

</td>
<td>

Wallet address for encrypted file storage.
When provided, MCP-generated images are automatically encrypted and stored
in OPFS using wallet-derived keys. Messages are returned with working blob URLs.

Requires:

* OPFS browser support
* Encryption key to be requested via `requestEncryptionKey` first

When not provided, falls back to the `writeFile` callback in sendMessage args.

</td>
</tr>
</tbody>
</table>

## Returns

[`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)
