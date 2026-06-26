# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1517](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1517)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1530](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1530)

Base URL for the API.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1534](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1534)

Cache expiration in ms for the server-tools catalog fetch.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1532](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1532)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1528](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1528)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1519](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1519)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1526](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1526)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
