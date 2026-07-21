# UseChatStorageOptions

Defined in: [src/expo/useChatStorage.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#336)

Options for useChatStorage hook (Expo version)

Uses the base options without React-specific features (no local chat, no tools).

## Extends

* `BaseUseChatStorageOptions`

## Properties

### apiType?

> `optional` **apiType**: `ApiType`

Defined in: [src/expo/useChatStorage.ts:342](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#342)

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

***

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:429](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#429)

Automatically create a new conversation if none is set (default: true)

**Inherited from**

`BaseUseChatStorageOptions.autoCreateConversation`

***

### autoEmbedMessages?

> `optional` **autoEmbedMessages**: `boolean`

Defined in: [src/lib/db/chat/types.ts:495](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#495)

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

Defined in: [src/expo/useChatStorage.ts:373](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#373)

Auto-flush queued operations when key becomes available.

**Default**

```ts
true
```

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:435](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#435)

Base URL for the chat API endpoint

**Inherited from**

`BaseUseChatStorageOptions.baseUrl`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:427](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#427)

ID of an existing conversation to load and continue

**Inherited from**

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:425](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#425)

WatermelonDB database instance for storing conversations and messages

**Inherited from**

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:431](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#431)

Title for auto-created conversations (default: "New conversation")

**Inherited from**

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../../../react/Internal/type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/expo/useChatStorage.ts:358](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#358)

Function for silent signing with Privy embedded wallets.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:500](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#500)

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

Defined in: [src/expo/useChatStorage.ts:368](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#368)

Enable the in-memory write queue.

**Default**

```ts
true
```

***

### fileProcessingOptions?

> `optional` **fileProcessingOptions**: `object`

Defined in: [src/lib/db/chat/types.ts:464](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#464)

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

Defined in: [src/lib/db/chat/types.ts:460](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#460)

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

**Inherited from**

`BaseUseChatStorageOptions.fileProcessors`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/chat/types.ts:433](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#433)

Function to retrieve the auth token for API requests

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseChatStorageOptions.getToken`

***

### getWalletAddress()?

> `optional` **getWalletAddress**: () => `Promise`<`string` | `null`>

Defined in: [src/expo/useChatStorage.ts:363](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#363)

Async function to poll for wallet address during Privy initialization.

**Returns**

`Promise`<`string` | `null`>

***

### mcpR2Domain?

> `optional` **mcpR2Domain**: `string`

Defined in: [src/lib/db/chat/types.ts:512](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#512)

R2 domain for identifying MCP-generated image URLs.
When set, enables OPFS caching of generated images.
Defaults to the hardcoded MCP\_R2\_DOMAIN from clientConfig.

**Inherited from**

`BaseUseChatStorageOptions.mcpR2Domain`

***

### minContentLength?

> `optional` **minContentLength**: `number`

Defined in: [src/lib/db/chat/types.ts:506](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#506)

Minimum content length required to generate embeddings.
Messages shorter than this are skipped as they provide limited semantic value.

**Default**

```ts
10
```

**Inherited from**

`BaseUseChatStorageOptions.minContentLength`

***

### nerDetector?

> `optional` **nerDetector**: `NerDetector`

Defined in: [src/lib/db/chat/types.ts:548](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#548)

Optional on-device NER detector for *unstructured* PII (names, locations,
organizations) that regex can't catch. When supplied AND `piiRedaction` is
active, the conversation redactor merges its spans into the outbound
message redaction (chat-send path only). Supply e.g.
`createTransformersNerDetector()` from `@anuma/sdk/pii/transformers` on web.
Ignored when `piiRedaction` is off. See NerDetector.

**Inherited from**

`BaseUseChatStorageOptions.nerDetector`

***

### onCancelResult()?

> `optional` **onCancelResult**: (`result`: `object`) => `void`

Defined in: [src/expo/useChatStorage.ts:391](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#391)

Observability for the fire-and-forget cancel POST that `stop()` issues for
a resumable stream. Forwarded to the underlying `useChat`. The
stop-without-cancel billing risk must be visible: once the capability
header ships, the portal no longer treats a dropped socket as cancellation,
so a `stop()` whose cancel POST silently fails bills the full generation.

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

`result`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`result.error?`

</td>
<td>

`Error`

</td>
</tr>
<tr>
<td>

`result.inferenceId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`result.ok`

</td>
<td>

`boolean`

</td>
</tr>
<tr>
<td>

`result.status?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:437](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#437)

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

Defined in: [src/lib/db/chat/types.ts:443](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#443)

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

Defined in: [src/lib/db/chat/types.ts:441](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#441)

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

> `optional` **onPiiRedacted**: (`matches`: [`PiiMatch`](PiiMatch.md)\[]) => `void`

Defined in: [src/lib/db/chat/types.ts:539](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#539)

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

[`PiiMatch`](PiiMatch.md)\[]

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

Defined in: [src/lib/db/chat/types.ts:448](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#448)

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

### onStreamMeta()?

> `optional` **onStreamMeta**: (`meta`: `object`) => `void`

Defined in: [src/expo/useChatStorage.ts:406](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#406)

Observe the stream metadata the portal issues at HEADERS\_RECEIVED, once per
round. Forwarded to the underlying `useChat`. The enriched payload carries
the RESOLVED `apiType` and `model` alongside `inferenceId`, so a consumer
can persist a rebuildable [StreamResumeHandle](../../../react/Internal/type-aliases/StreamResumeHandle.md) for a cold-launch
resume registry (mobile PR5). Additive — never alters the internal
resume-handle capture.

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

`meta`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`meta.apiType`

</td>
<td>

`"responses"` | `"completions"`

</td>
</tr>
<tr>
<td>

`meta.inferenceId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`meta.model?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`meta.round?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onThinking()?

> `optional` **onThinking**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:439](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#439)

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

Defined in: [src/lib/db/chat/types.ts:453](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#453)

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

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../classes/PiiRedactor.md)

Defined in: [src/lib/db/chat/types.ts:534](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#534)

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

> `optional` **preProcessors**: [`PromptPreProcessor`](../../../react/Internal/type-aliases/PromptPreProcessor.md)\[]

Defined in: [src/lib/db/chat/types.ts:522](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#522)

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

### resumable?

> `optional` **resumable**: `boolean`

Defined in: [src/expo/useChatStorage.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#382)

Opt into resumable streaming. When `true`, `sendMessage` sends the
resumable capability header, a stable `assistantUniqueId` is allocated for
every turn (so the partial and the resumed completion reconcile onto ONE
row), and `detach()` / `resumeStream()` become usable. Off by default.

**Default**

```ts
false
```

***

### serverTools?

> `optional` **serverTools**: `object`

Defined in: [src/lib/db/chat/types.ts:478](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#478)

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

> `optional` **signMessage**: [`SignMessageFn`](../../../react/Internal/type-aliases/SignMessageFn.md)

Defined in: [src/expo/useChatStorage.ts:353](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#353)

Function to sign a message for encryption key derivation.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/expo/useChatStorage.ts:348](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#348)

Wallet address for field-level encryption.
When provided with signMessage, all sensitive content is encrypted at rest.
