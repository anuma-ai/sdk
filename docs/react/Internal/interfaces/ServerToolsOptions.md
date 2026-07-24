# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#127)

Options for fetching server tools

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/tools/serverTools.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#137)

Direct API key for server-side usage (uses X-API-Key header)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#129)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cache?

> `optional` **cache**: `ToolsCacheBackend`

Defined in: [src/lib/tools/serverTools.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#143)

Where to read/write the cached tools list. Defaults to
localStorageToolsCache (browser `localStorage`; no-op elsewhere).
Provide a backend to enable caching on Node / React Native.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#131)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#133)

Force refresh even if cache is valid

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#135)

Authentication token getter (uses Authorization: Bearer header)

**Returns**

`Promise`<`string` | `null`>
