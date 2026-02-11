# UseChatStorageOptions

Defined in: [src/react/useChatStorage.ts:229](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L229)

Options for useChatStorage hook (React version)

Extends base options with apiType support.

## Extends

* `BaseUseChatStorageOptions`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/react/useChatStorage.ts:235](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L235)

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

***

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:236](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L236)

Automatically create a new conversation if none is set (default: true)

**Inherited from**

`BaseUseChatStorageOptions.autoCreateConversation`

***

### autoEmbedMessages?

> `optional` **autoEmbedMessages**: `boolean`

Defined in: [src/lib/db/chat/types.ts:289](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L289)

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

Defined in: [src/react/useChatStorage.ts:284](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L284)

Automatically flush queued operations when the encryption key becomes
available. Requires `enableQueue` to be true.

**Default**

```ts
true
```

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:242](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L242)

Base URL for the chat API endpoint

**Inherited from**

`BaseUseChatStorageOptions.baseUrl`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L234)

ID of an existing conversation to load and continue

**Inherited from**

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:232](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L232)

WatermelonDB database instance for storing conversations and messages

**Inherited from**

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:238](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L238)

Title for auto-created conversations (default: "New conversation")

**Inherited from**

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/react/useChatStorage.ts:262](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L262)

Function for silent signing with Privy embedded wallets.
When provided, enables automatic encryption key derivation without
user confirmation modals.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:294](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L294)

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

Defined in: [src/react/useChatStorage.ts:277](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L277)

Enable the in-memory write queue for operations when encryption key
isn't yet available. When enabled, operations are held in memory and
flushed to encrypted storage once the key becomes available.

**Default**

```ts
true
```

***

### fileProcessingOptions?

> `optional` **fileProcessingOptions**: `object`

Defined in: [src/lib/db/chat/types.ts:266](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L266)

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

Defined in: [src/lib/db/chat/types.ts:262](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L262)

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

**Inherited from**

`BaseUseChatStorageOptions.fileProcessors`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/chat/types.ts:240](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L240)

Function to retrieve the auth token for API requests

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseChatStorageOptions.getToken`

***

### getWalletAddress()?

> `optional` **getWalletAddress**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useChatStorage.ts:269](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L269)

Async function that returns the wallet address when available.
Used for polling during Privy embedded wallet initialization.
When the wallet isn't ready yet, should return null.

**Returns**

`Promise`<`string` | `null`>

***

### minContentLength?

> `optional` **minContentLength**: `number`

Defined in: [src/lib/db/chat/types.ts:300](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L300)

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

Defined in: [src/lib/db/chat/types.ts:244](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L244)

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

Defined in: [src/lib/db/chat/types.ts:250](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L250)

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

Defined in: [src/lib/db/chat/types.ts:248](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L248)

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

Defined in: [src/lib/db/chat/types.ts:255](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L255)

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

Defined in: [src/lib/db/chat/types.ts:246](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L246)

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

Defined in: [src/lib/db/chat/types.ts:280](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L280)

Configuration for server-side tools fetching and caching.
Server tools are fetched from /api/v1/tools and cached in localStorage.

**cacheExpirationMs?**

> `optional` **cacheExpirationMs**: `number`

Cache expiration time in milliseconds (default: 86400000 = 1 day)

**Inherited from**

`BaseUseChatStorageOptions.serverTools`

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/react/useChatStorage.ts:255](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L255)

Function to sign a message for encryption key derivation.
Typically from Privy's useSignMessage hook.
Required together with walletAddress for field-level encryption.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useChatStorage.ts:248](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L248)

Wallet address for encrypted file storage and field-level encryption.
When provided with signMessage, all sensitive message content, conversation titles,
and media metadata are encrypted at rest using AES-GCM with wallet-derived keys.

Requires:

* OPFS browser support (for file storage)
* signMessage function (for encryption key derivation)

When not provided, data is stored in plaintext (backwards compatible).
