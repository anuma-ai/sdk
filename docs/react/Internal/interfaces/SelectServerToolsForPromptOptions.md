# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1229](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1229)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1242](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1242)

Base URL for the API.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1246](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1246)

Cache expiration in ms for the server-tools catalog fetch.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1244](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1244)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1240](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1240)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1231](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1231)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1238](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1238)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
