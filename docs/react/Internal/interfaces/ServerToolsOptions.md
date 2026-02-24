# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#91)

Options for fetching server tools

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/tools/serverTools.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#101)

Direct API key for server-side usage (uses X-API-Key header)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#93)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#95)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#97)

Force refresh even if cache is valid

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#99)

Authentication token getter (uses Authorization: Bearer header)

**Returns**

`Promise`<`string` | `null`>
