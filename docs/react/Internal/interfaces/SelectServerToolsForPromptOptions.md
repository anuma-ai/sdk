# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1087](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1087)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1100](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1100)

Base URL for the API.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1104](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1104)

Cache expiration in ms for the server-tools catalog fetch.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1102](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1102)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1098](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1098)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1089](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1089)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1096](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1096)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
