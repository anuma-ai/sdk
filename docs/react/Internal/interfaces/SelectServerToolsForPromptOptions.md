# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1626](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1626)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1639](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1639)

Base URL for the API.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1643](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1643)

Cache expiration in ms for the server-tools catalog fetch.

***

### deferLoading?

> `optional` **deferLoading**: `DeferLoadingConfig`

Defined in: [src/lib/tools/serverTools.ts:1649](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1649)

Phase 3 defer-loading. When `enabled`, this helper returns the FULL catalog (skipping semantic/
static filtering) to mirror useChatStorage's responses send path, which swaps in the full catalog
for mergeTools + tool-search. Omit/disabled → today's filtered selection.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1641](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1641)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1637](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1637)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1628](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1628)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1635](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1635)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
