# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1668](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1668)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1681](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1681)

Base URL for the API.

***

### cache?

> `optional` **cache**: `ToolsCacheBackend`

Defined in: [src/lib/tools/serverTools.ts:1690](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1690)

Where to read/write the cached catalog. Defaults to browser `localStorage`
(a no-op on Node/RN); pass a backend to persist on those platforms.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1685](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1685)

Cache expiration in ms for the server-tools catalog fetch.

***

### deferLoading?

> `optional` **deferLoading**: `DeferLoadingConfig`

Defined in: [src/lib/tools/serverTools.ts:1696](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1696)

Phase 3 defer-loading. When `enabled`, this helper returns the FULL catalog (skipping semantic/
static filtering) to mirror useChatStorage's responses send path, which swaps in the full catalog
for mergeTools + tool-search. Omit/disabled → today's filtered selection.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1683](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1683)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1679](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1679)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1670](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1670)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1677](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1677)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
