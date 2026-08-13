# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1695](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1695)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1708](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1708)

Base URL for the API.

***

### cache?

> `optional` **cache**: `ToolsCacheBackend`

Defined in: [src/lib/tools/serverTools.ts:1717](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1717)

Where to read/write the cached catalog. Defaults to browser `localStorage`
(a no-op on Node/RN); pass a backend to persist on those platforms.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1712](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1712)

Cache expiration in ms for the server-tools catalog fetch.

***

### deferLoading?

> `optional` **deferLoading**: `DeferLoadingConfig`

Defined in: [src/lib/tools/serverTools.ts:1723](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1723)

Phase 3 defer-loading. When `enabled`, this helper returns the FULL catalog (skipping semantic/
static filtering) to mirror useChatStorage's responses send path, which swaps in the full catalog
for mergeTools + tool-search. Omit/disabled → today's filtered selection.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1710](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1710)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1706](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1706)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1697](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1697)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1704](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1704)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
