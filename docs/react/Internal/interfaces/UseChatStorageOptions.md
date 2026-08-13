# UseChatStorageOptions

Defined in: [src/react/useChatStorage.ts:611](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#611)

Options for useChatStorage hook (React version)

Extends base options with apiType support.

## Extends

* `BaseUseChatStorageOptions`

## Properties

### activeToolSets?

> `optional` **activeToolSets**: `string`\[]

Defined in: [src/react/useChatStorage.ts:706](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#706)

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

Defined in: [src/react/useChatStorage.ts:617](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#617)

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

***

### autoCreateConversation?

> `optional` **autoCreateConversation**: `boolean`

Defined in: [src/lib/db/chat/types.ts:499](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#499)

Automatically create a new conversation if none is set (default: true)

**Inherited from**

`BaseUseChatStorageOptions.autoCreateConversation`

***

### autoEmbedMessages?

> `optional` **autoEmbedMessages**: `boolean`

Defined in: [src/lib/db/chat/types.ts:572](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#572)

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

Defined in: [src/react/useChatStorage.ts:679](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#679)

Automatically flush queued operations when the encryption key becomes
available. Requires `enableQueue` to be true.

**Default**

```ts
true
```

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/chat/types.ts:505](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#505)

Base URL for the chat API endpoint

**Inherited from**

`BaseUseChatStorageOptions.baseUrl`

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:497](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#497)

ID of an existing conversation to load and continue

**Inherited from**

`BaseUseChatStorageOptions.conversationId`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/types.ts:495](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#495)

WatermelonDB database instance for storing conversations and messages

**Inherited from**

`BaseUseChatStorageOptions.database`

***

### defaultConversationTitle?

> `optional` **defaultConversationTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:501](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#501)

Title for auto-created conversations (default: "New conversation")

**Inherited from**

`BaseUseChatStorageOptions.defaultConversationTitle`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/react/useChatStorage.ts:657](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#657)

Function for silent signing with Privy embedded wallets.
When provided, enables automatic encryption key derivation without
user confirmation modals.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:577](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#577)

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

Defined in: [src/react/useChatStorage.ts:672](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#672)

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

Defined in: [src/react/useChatStorage.ts:690](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#690)

Additional tool sets to apply on top of the built-in ones (app-generation,
slides, github). When any anchor tool in a custom set is selected by
semantic matching, all members of that set are included automatically.

Treated as static config — set once at hook setup. Changing it across
renders does not affect in-flight `sendMessage` calls; use
`activeToolSets` for dynamic, conversation-state-driven overrides.

***

### fileProcessingOptions?

> `optional` **fileProcessingOptions**: `object`

Defined in: [src/lib/db/chat/types.ts:534](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#534)

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

Defined in: [src/lib/db/chat/types.ts:530](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#530)

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

**Inherited from**

`BaseUseChatStorageOptions.fileProcessors`

***

### foldToolResultsInHistory?

> `optional` **foldToolResultsInHistory**: `boolean`

Defined in: [src/lib/db/chat/types.ts:623](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#623)

Fold persisted `[Tool Execution Results]` rows onto the assistant turn that produced them
when replaying stored history, instead of dropping them.

**Defaults to `false`, and that default is deliberate.** Folding is the better behaviour —
it is what lets a follow-up about a tool's output work after a reload — but it moves the
payload from a `role: "user"` row onto an `assistant` row. Any consumer that scrubs these
rows by checking `role === "user"` plus the content prefix (which is how both apps did it
before this option existed) stops catching them the moment folding turns on, and starts
replaying whatever the row held. Opting in is therefore a statement that the caller has
checked its own filters and set [toolResultsHistoryExclude](#toolresultshistoryexclude) for any payload that must
not reach the model.

With it off, rows are dropped from the replayed history rather than sent verbatim. Verbatim
would put two consecutive `user` turns on the wire, and the model answers the previous turn
instead of the new prompt.

**Inherited from**

`BaseUseChatStorageOptions.foldToolResultsInHistory`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/chat/types.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#503)

Function to retrieve the auth token for API requests

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseChatStorageOptions.getToken`

***

### getWalletAddress()?

> `optional` **getWalletAddress**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useChatStorage.ts:664](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#664)

Async function that returns the wallet address when available.
Used for polling during Privy embedded wallet initialization.
When the wallet isn't ready yet, should return null.

**Returns**

`Promise`<`string` | `null`>

***

### mcpR2Domain?

> `optional` **mcpR2Domain**: `string`

Defined in: [src/lib/db/chat/types.ts:589](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#589)

R2 domain for identifying MCP-generated image URLs.
When set, enables OPFS caching of generated images.
Defaults to the hardcoded MCP\_R2\_DOMAIN from clientConfig.

**Inherited from**

`BaseUseChatStorageOptions.mcpR2Domain`

***

### minContentLength?

> `optional` **minContentLength**: `number`

Defined in: [src/lib/db/chat/types.ts:583](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#583)

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

Defined in: [src/lib/db/chat/types.ts:659](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#659)

Optional on-device NER detector for *unstructured* PII (names, locations,
organizations) that regex can't catch. When supplied AND `piiRedaction` is
active, the conversation redactor merges its spans into the outbound
message redaction (chat-send path only). Supply e.g.
`createTransformersNerDetector()` from `@anuma/sdk/pii/transformers` on web.
Ignored when `piiRedaction` is off. See NerDetector.

**Inherited from**

`BaseUseChatStorageOptions.nerDetector`

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/db/chat/types.ts:507](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#507)

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

Defined in: [src/lib/db/chat/types.ts:513](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#513)

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

Defined in: [src/lib/db/chat/types.ts:511](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#511)

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

Defined in: [src/lib/db/chat/types.ts:650](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#650)

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

Defined in: [src/lib/db/chat/types.ts:518](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#518)

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

Defined in: [src/lib/db/chat/types.ts:509](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#509)

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

Defined in: [src/lib/db/chat/types.ts:523](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#523)

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

Defined in: [src/react/useChatStorage.ts:626](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#626)

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

Defined in: [src/lib/db/chat/types.ts:645](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#645)

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

> `optional` **preProcessors**: [`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)\[]

Defined in: [src/lib/db/chat/types.ts:633](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#633)

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

Defined in: [src/lib/db/chat/types.ts:548](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#548)

Configuration for server-side tools fetching and caching.
Server tools are fetched from /api/v1/tools and cached in localStorage.

**cache?**

> `optional` **cache**: `ToolsCacheBackend`

Where to read/write the cached server-tools catalog. Defaults to browser
`localStorage`, which is a silent no-op on React Native — so on RN pass an
AsyncStorage/MMKV-backed ToolsCacheBackend here or every send
refetches the whole catalog. Forwarded to `getServerTools`.

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

Defined in: [src/react/useChatStorage.ts:650](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#650)

Function to sign a message for encryption key derivation.
Typically from Privy's useSignMessage hook.
Required together with walletAddress for field-level encryption.

***

### toolResultsHistoryExclude?

> `optional` **toolResultsHistoryExclude**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:605](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#605)

Tool names whose persisted results must never be replayed to the model.

A turn's auto-executed tool results are stored as a synthetic
`[Tool Execution Results]` row and, on a replayed send, folded back onto the
assistant turn they belong to — that is what lets a follow-up question about a
tool's output work after a reload. Name a tool here when its payload exists for
the RENDERER rather than the model: a display card can carry data the model was
deliberately never given (People Nearby's card holds third parties' snapped
coordinates, which the search result strips), and replaying it would hand that
data straight back.

Hook-level rather than per-send on purpose: an exclusion that has to be
remembered at every call site is one bad send away from leaking.

**Inherited from**

`BaseUseChatStorageOptions.toolResultsHistoryExclude`

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useChatStorage.ts:643](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#643)

Wallet address for encrypted file storage and field-level encryption.
When provided with signMessage, all sensitive message content, conversation titles,
and media metadata are encrypted at rest using AES-GCM with wallet-derived keys.

Requires:

* OPFS browser support (for file storage)
* signMessage function (for encryption key derivation)

When not provided, data is stored in plaintext (backwards compatible).
