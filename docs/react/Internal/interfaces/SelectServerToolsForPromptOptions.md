# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1542](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1542)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1555](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1555)

Base URL for the API.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1559](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1559)

Cache expiration in ms for the server-tools catalog fetch.

***

### deferLoading?

> `optional` **deferLoading**: `DeferLoadingConfig`

Defined in: [src/lib/tools/serverTools.ts:1565](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1565)

Phase 3 defer-loading. When `enabled`, this helper returns the FULL catalog (skipping semantic/
static filtering) to mirror useChatStorage's responses send path, which swaps in the full catalog
for mergeTools + tool-search. Omit/disabled → today's filtered selection.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1557](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1557)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1553](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1553)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1544](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1544)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1551](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1551)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
