# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1700](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1700)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1713](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1713)

Base URL for the API.

***

### cache?

> `optional` **cache**: `ToolsCacheBackend`

Defined in: [src/lib/tools/serverTools.ts:1722](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1722)

Where to read/write the cached catalog. Defaults to browser `localStorage`
(a no-op on Node/RN); pass a backend to persist on those platforms.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1717](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1717)

Cache expiration in ms for the server-tools catalog fetch.

***

### deferLoading?

> `optional` **deferLoading**: `DeferLoadingConfig`

Defined in: [src/lib/tools/serverTools.ts:1729](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1729)

Phase 3 defer-loading. When `enabled`, this helper skips SEMANTIC filtering to mirror
useChatStorage's responses send path, which hands the catalog to mergeTools + tool-search. The
caller's unconditional constraints still apply — an explicit static array, and exclusions (see
resolveDeferredServerTools). Omit/disabled → today's filtered selection.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1715](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1715)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1711](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1711)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1702](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1702)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1709](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1709)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
