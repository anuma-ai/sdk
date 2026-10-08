# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1574](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1574)

Options for `selectServerToolsForPrompt`.

## Properties

### activeToolSets?

> `optional` **activeToolSets**: `string`\[]

Defined in: [src/lib/tools/serverTools.ts:1611](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1611)

Tool-set names that are sticky for this conversation — the same list you
pass to `useChatStorage`'s `activeToolSets`, e.g. from
`deriveActiveToolSets`. With a filter function, the server-tool members of
these sets are selected whatever the prompt scored, even on a prompt too
short to embed. Omit for selection from the prompt alone.

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1587](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1587)

Base URL for the API.

***

### cache?

> `optional` **cache**: `ToolsCacheBackend`

Defined in: [src/lib/tools/serverTools.ts:1596](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1596)

Where to read/write the cached catalog. Defaults to browser `localStorage`
(a no-op on Node/RN); pass a backend to persist on those platforms.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1591](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1591)

Cache expiration in ms for the server-tools catalog fetch.

***

### deferLoading?

> `optional` **deferLoading**: `DeferLoadingConfig`

Defined in: [src/lib/tools/serverTools.ts:1603](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1603)

Phase 3 defer-loading. When `enabled`, this helper skips SEMANTIC filtering to mirror
useChatStorage's responses send path, which hands the catalog to mergeTools + tool-search. The
caller's unconditional constraints still apply — an explicit static array, and exclusions (see
resolveDeferredServerTools). Omit/disabled → today's filtered selection.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1589](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1589)

Embedding model override. Falls back to the SDK default.

***

### extraToolSets?

> `optional` **extraToolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1617](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1617)

The caller's sets beyond [BUILT\_IN\_TOOL\_SETS](../variables/BUILT_IN_TOOL_SETS.md) — the same list you pass
to `useChatStorage`'s `extraToolSets` — so a custom set named in
`activeToolSets` stays sticky here too.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1585](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1585)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1576](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1576)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1583](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1583)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
