# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#92)

Options for fetching server tools

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/tools/serverTools.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#102)

Direct API key for server-side usage (uses X-API-Key header)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#94)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#96)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#98)

Force refresh even if cache is valid

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#100)

Authentication token getter (uses Authorization: Bearer header)

**Returns**

`Promise`<`string` | `null`>
