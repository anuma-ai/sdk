# useChatStorage

> **useChatStorage**(`options`: `object`): [`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)

Defined in: [src/react/useChatStorage.ts:1307](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#1307)

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

`options.activeToolSets?`

</td>
<td>

`string`\[]

</td>
<td>

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

`options.autoFlushOnKeyAvailable?`

</td>
<td>

`boolean`

</td>
<td>

Automatically flush queued operations when the encryption key becomes
available. Requires `enableQueue` to be true.

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

`options.embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

</td>
<td>

Function for silent signing with Privy embedded wallets.
When provided, enables automatic encryption key derivation without
user confirmation modals.

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

`options.enableQueue?`

</td>
<td>

`boolean`

</td>
<td>

Enable the in-memory write queue for operations when encryption key
isn't yet available. When enabled, operations are held in memory and
flushed to encrypted storage once the key becomes available.

**Default**

```ts
true
```

</td>
</tr>
<tr>
<td>

`options.extraToolSets?`

</td>
<td>

[`ToolSet`](../interfaces/ToolSet.md)\[]

</td>
<td>

Additional tool sets to apply on top of the built-in ones (app-generation,
slides, github). When any anchor tool in a custom set is selected by
semantic matching, all members of that set are included automatically.

Treated as static config — set once at hook setup. Changing it across
renders does not affect in-flight `sendMessage` calls; use
`activeToolSets` for dynamic, conversation-state-driven overrides.

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

[`FileProcessor`](../interfaces/FileProcessor.md)\[] | `null`

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

`options.getWalletAddress?`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

Async function that returns the wallet address when available.
Used for polling during Privy embedded wallet initialization.
When the wallet isn't ready yet, should return null.

</td>
</tr>
<tr>
<td>

`options.mcpR2Domain?`

</td>
<td>

`string`

</td>
<td>

R2 domain for identifying MCP-generated image URLs.
When set, enables OPFS caching of generated images.
Defaults to the hardcoded MCP\_R2\_DOMAIN from clientConfig.

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

`options.nerDetector?`

</td>
<td>

`NerDetector`

</td>
<td>

Optional on-device NER detector for *unstructured* PII (names, locations,
organizations) that regex can't catch. When supplied AND `piiRedaction` is
active, the conversation redactor merges its spans into the outbound
message redaction (chat-send path only). Supply e.g.
`createTransformersNerDetector()` from `@anuma/sdk/pii/transformers` on web.
Ignored when `piiRedaction` is off. See NerDetector.

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

`options.onPiiRedacted?`

</td>
<td>

(`matches`: [`PiiMatch`](../../../expo/Internal/interfaces/PiiMatch.md)\[]) => `void`

</td>
<td>

Called with the PII matches found whenever outbound messages are redacted.
Only fired when `piiRedaction` is active and at least one match was found.

</td>
</tr>
<tr>
<td>

`options.onServerToolCall?`

</td>
<td>

(`toolCall`: `ServerToolCallEvent`) => `void`

</td>
<td>

Callback invoked when a server-side tool (MCP) is called during streaming.
Use this to show activity indicators like "Searching..." in the UI.

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

`options.onToolCallArgumentsDelta?`

</td>
<td>

(`event`: [`ToolCallArgumentsDeltaEvent`](../type-aliases/ToolCallArgumentsDeltaEvent.md)) => `void`

</td>
<td>

Called with partial tool call arguments as they stream in.
Use for live preview of artifacts (HTML, slides) being generated.

</td>
</tr>
<tr>
<td>

`options.onToolSelection?`

</td>
<td>

(`info`: `object`) => `void`

</td>
<td>

Called once per `sendMessage` with the user prompt and the FINAL tool
selection — after semantic filtering, tool-set expansion, and exclusions;
exactly the tools the request carries. Intended for debug logging and
selection QA (e.g. a prefixed plain-text console line you can filter on).
Errors thrown by the callback are swallowed.

</td>
</tr>
<tr>
<td>

`options.piiRedaction?`

</td>
<td>

`boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

</td>
<td>

Enable best-effort, client-side PII obfuscation (NOT a compliance
guarantee). Outbound message text is scanned for personally identifiable
information and replaced with tagged placeholders before reaching the LLM
provider; responses are de-anonymized automatically. Embedding inputs and
the summarization prompt are redacted too. Regex-based detection does not
cover names, non-text content, or tool-call arguments.

* `true`: one redactor is shared per conversation
* `PiiRedactor` instance: bring your own (tune via constructor options)

</td>
</tr>
<tr>
<td>

`options.preProcessors?`

</td>
<td>

[`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)\[]

</td>
<td>

Pre-processors run after the last user message is received but before
the first LLM request. Each receives the prompt text and a shared
embedding (computed once per request) and may return messages to
enrich the conversation. Forwarded to the underlying `useChat` hook.
See `createWebSearchPreProcessor`, `createCryptoPricePreProcessor`,
`createStockPricePreProcessor`, `createWeatherPreProcessor`, or write
a custom one matching `PromptPreProcessor`.

</td>
</tr>
<tr>
<td>

`options.serverTools?`

</td>
<td>

{ `cacheExpirationMs?`: `number`; `deferLoading?`: `DeferLoadingConfig`; }

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

`options.serverTools.deferLoading?`

</td>
<td>

`DeferLoadingConfig`

</td>
<td>

Opt-in defer-loading (Phase 3). OFF by default → tools are sent exactly as today. When
`enabled`, the full server catalog is emitted every turn in a deterministic, byte-stable order
(`[tool-search] → [hot] → [deferred, name-sorted]`) with `defer_loading:true` on non-hot tools and
an Anthropic tool-search tool prepended, so the leading `tools` prefix stays cacheable. See
DeferLoadingConfig.

</td>
</tr>
<tr>
<td>

`options.signMessage?`

</td>
<td>

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

</td>
<td>

Function to sign a message for encryption key derivation.
Typically from Privy's useSignMessage hook.
Required together with walletAddress for field-level encryption.

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

Wallet address for encrypted file storage and field-level encryption.
When provided with signMessage, all sensitive message content, conversation titles,
and media metadata are encrypted at rest using AES-GCM with wallet-derived keys.

Requires:

* OPFS browser support (for file storage)
* signMessage function (for encryption key derivation)

When not provided, data is stored in plaintext (backwards compatible).

</td>
</tr>
</tbody>
</table>

## Returns

[`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)
