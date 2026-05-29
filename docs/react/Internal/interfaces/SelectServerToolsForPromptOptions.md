# SelectServerToolsForPromptOptions

Defined in: [src/lib/tools/serverTools.ts:1152](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1152)

Options for `selectServerToolsForPrompt`.

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:1165](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1165)

Base URL for the API.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:1169](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1169)

Cache expiration in ms for the server-tools catalog fetch.

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/tools/serverTools.ts:1167](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1167)

Embedding model override. Falls back to the SDK default.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:1163](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1163)

Function that resolves an auth token (Bearer).

**Returns**

`Promise`<`string` | `null`>

***

### prompt

> **prompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:1154](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1154)

User prompt to match tools against.

***

### serverToolsFilter?

> `optional` **serverToolsFilter**: `string`\[] | [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1161](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1161)

Filter to apply: either a function (called with the prompt embedding +
full catalog) or a static list of tool names. Same shape `useChatStorage`
accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
mirror the default chat-flow selection.
