# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1380](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1380)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1393](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1393)

Base URL for the API.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1397](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1397)

Cache expiration in ms for the server-tools catalog fetch.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1395](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1395)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1391](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1391)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1382](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1382)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1389](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1389)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
