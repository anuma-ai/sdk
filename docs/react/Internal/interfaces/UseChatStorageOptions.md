# UseChatStorageOptions

Defined in: [src/react/useChatStorage.ts:780](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#780)

Options for useChatStorage hook (React version)

Extends base options with apiType support.

## Extends

* `BaseUseChatStorageOptions`

## Properties

### activeToolSets?

> `optional` **activeToolSets**: `string`\[]

Defined in: [src/react/useChatStorage.ts:875](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#875)

Tool set names that should expand unconditionally for this request,
bypassing the anchor-similarity check. Use when conversation state
implies a set should be present regardless of how the prompt is phrased
— e.g., pass `["slides"]` when the conversation already contains a slide
deck artifact, so short follow-up prompts ("add a thank you slide",
"make it bigger") still get the full slide toolkit.

Read via a ref so updates are visible to in-flight `sendMessage` calls
without rebuilding the callback.

Names must match a set's `name` from `BUILT_IN_TOOL_SETS` or
`extraToolSets`. Unknown names are ignored.

***

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/react/useChatStorage.ts:786](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#786)

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

***

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:352](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#352)

Automatically create a new conversation if none is set (default: true)

**Inherited from**

`BaseUseChatStorageOptions.autoCreateConversation`

***

### autoEmbedMessages?

> `optional` **autoEmbedMessages**: `boolean`

Defined in: [src/lib/db/chat/types.ts:418](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#418)

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

Defined in: [src/react/useChatStorage.ts:848](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#848)

Automatically flush queued operations when the encryption key becomes
available. Requires `enableQueue` to be true.

**Default**

```ts
true
```

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:358](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#358)

Base URL for the chat API endpoint

**Inherited from**

`BaseUseChatStorageOptions.baseUrl`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#350)

ID of an existing conversation to load and continue

**Inherited from**

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:348](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#348)

WatermelonDB database instance for storing conversations and messages

**Inherited from**

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:354](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#354)

Title for auto-created conversations (default: "New conversation")

**Inherited from**

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/react/useChatStorage.ts:826](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#826)

Function for silent signing with Privy embedded wallets.
When provided, enables automatic encryption key derivation without
user confirmation modals.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#423)

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

Defined in: [src/react/useChatStorage.ts:841](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#841)

Enable the in-memory write queue for operations when encryption key
isn't yet available. When enabled, operations are held in memory and
flushed to encrypted storage once the key becomes available.

**Default**

```ts
true
```

***

### extraToolSets?

> `optional` **extraToolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/react/useChatStorage.ts:859](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#859)

Additional tool sets to apply on top of the built-in ones (app-generation,
slides, github). When any anchor tool in a custom set is selected by
semantic matching, all members of that set are included automatically.

Treated as static config — set once at hook setup. Changing it across
renders does not affect in-flight `sendMessage` calls; use
`activeToolSets` for dynamic, conversation-state-driven overrides.

***

### fileProcessingOptions?

> `optional` **fileProcessingOptions**: `object`

Defined in: [src/lib/db/chat/types.ts:387](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#387)

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

> `optional` **fileProcessors**: [`FileProcessor`](FileProcessor.md)\[] | `null`

Defined in: [src/lib/db/chat/types.ts:383](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#383)

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

**Inherited from**

`BaseUseChatStorageOptions.fileProcessors`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/chat/types.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#356)

Function to retrieve the auth token for API requests

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseChatStorageOptions.getToken`

***

### getWalletAddress()?

> `optional` **getWalletAddress**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useChatStorage.ts:833](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#833)

Async function that returns the wallet address when available.
Used for polling during Privy embedded wallet initialization.
When the wallet isn't ready yet, should return null.

**Returns**

`Promise`<`string` | `null`>

***

### mcpR2Domain?

> `optional` **mcpR2Domain**: `string`

Defined in: [src/lib/db/chat/types.ts:435](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#435)

R2 domain for identifying MCP-generated image URLs.
When set, enables OPFS caching of generated images.
Defaults to the hardcoded MCP\_R2\_DOMAIN from clientConfig.

**Inherited from**

`BaseUseChatStorageOptions.mcpR2Domain`

***

### minContentLength?

> `optional` **minContentLength**: `number`

Defined in: [src/lib/db/chat/types.ts:429](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#429)

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

Defined in: [src/lib/db/chat/types.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#360)

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

Defined in: [src/lib/db/chat/types.ts:366](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#366)

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

Defined in: [src/lib/db/chat/types.ts:364](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#364)

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

### onPiiRedacted()?

> `optional` **onPiiRedacted**: (`matches`: [`PiiMatch`](../../../expo/Internal/interfaces/PiiMatch.md)\[]) => `void`

Defined in: [src/lib/db/chat/types.ts:462](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#462)

Called with the PII matches found whenever outbound messages are redacted.
Only fired when `piiRedaction` is active and at least one match was found.

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

`matches`

</td>
<td>

[`PiiMatch`](../../../expo/Internal/interfaces/PiiMatch.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onPiiRedacted`

***

### onServerToolCall()?

> `optional` **onServerToolCall**: (`toolCall`: `ServerToolCallEvent`) => `void`

Defined in: [src/lib/db/chat/types.ts:371](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#371)

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

Defined in: [src/lib/db/chat/types.ts:362](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#362)

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

> `optional` **onToolCallArgumentsDelta**: (`event`: [`ToolCallArgumentsDeltaEvent`](../type-aliases/ToolCallArgumentsDeltaEvent.md)) => `void`

Defined in: [src/lib/db/chat/types.ts:376](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#376)

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

[`ToolCallArgumentsDeltaEvent`](../type-aliases/ToolCallArgumentsDeltaEvent.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseChatStorageOptions.onToolCallArgumentsDelta`

***

### onToolSelection()?

> `optional` **onToolSelection**: (`info`: `object`) => `void`

Defined in: [src/react/useChatStorage.ts:795](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#795)

Called once per `sendMessage` with the user prompt and the FINAL tool
selection — after semantic filtering, tool-set expansion, and exclusions;
exactly the tools the request carries. Intended for debug logging and
selection QA (e.g. a prefixed plain-text console line you can filter on).
Errors thrown by the callback are swallowed.

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

`info`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`info.clientToolNames`

</td>
<td>

`string`\[]

</td>
</tr>
<tr>
<td>

`info.prompt`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`info.serverToolNames`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/db/chat/types.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#457)

Enable best-effort, client-side PII obfuscation (NOT a compliance
guarantee). Outbound message text is scanned for personally identifiable
information and replaced with tagged placeholders before reaching the LLM
provider; responses are de-anonymized automatically. Embedding inputs and
the summarization prompt are redacted too. Regex-based detection does not
cover names, non-text content, or tool-call arguments.

* `true`: one redactor is shared per conversation
* `PiiRedactor` instance: bring your own (tune via constructor options)

**Inherited from**

`BaseUseChatStorageOptions.piiRedaction`

***

### preProcessors?

> `optional` **preProcessors**: `PromptPreProcessor`\[]

Defined in: [src/lib/db/chat/types.ts:445](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#445)

Pre-processors run after the last user message is received but before
the first LLM request. Each receives the prompt text and a shared
embedding (computed once per request) and may return messages to
enrich the conversation. Forwarded to the underlying `useChat` hook.
See `createWebSearchPreProcessor`, `createCryptoPricePreProcessor`,
`createStockPricePreProcessor`, `createWeatherPreProcessor`, or write
a custom one matching `PromptPreProcessor`.

**Inherited from**

`BaseUseChatStorageOptions.preProcessors`

***

### serverTools?

> `optional` **serverTools**: `object`

Defined in: [src/lib/db/chat/types.ts:401](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#401)

Configuration for server-side tools fetching and caching.
Server tools are fetched from /api/v1/tools and cached in localStorage.

**cacheExpirationMs?**

> `optional` **cacheExpirationMs**: `number`

Cache expiration time in milliseconds (default: 86400000 = 1 day)

**deferLoading?**

> `optional` **deferLoading**: `DeferLoadingConfig`

Opt-in defer-loading (Phase 3). OFF by default → tools are sent exactly as today. When
`enabled`, the full server catalog is emitted every turn in a deterministic, byte-stable order
(`[tool-search] → [hot] → [deferred, name-sorted]`) with `defer_loading:true` on non-hot tools and
an Anthropic tool-search tool prepended, so the leading `tools` prefix stays cacheable. See
DeferLoadingConfig.

**Inherited from**

`BaseUseChatStorageOptions.serverTools`

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/react/useChatStorage.ts:819](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#819)

Function to sign a message for encryption key derivation.
Typically from Privy's useSignMessage hook.
Required together with walletAddress for field-level encryption.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useChatStorage.ts:812](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#812)

Wallet address for encrypted file storage and field-level encryption.
When provided with signMessage, all sensitive message content, conversation titles,
and media metadata are encrypted at rest using AES-GCM with wallet-derived keys.

Requires:

* OPFS browser support (for file storage)
* signMessage function (for encryption key derivation)

When not provided, data is stored in plaintext (backwards compatible).
