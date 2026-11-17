# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#104)

Options for fetching server tools

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/tools/serverTools.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#114)

Direct API key for server-side usage (uses X-API-Key header)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#106)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cache?

> `optional` **cache**: `ToolsCacheBackend`

Defined in: [src/lib/tools/serverTools.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#116)

Cache backend; defaults to localStorage with a memory fallback when localStorage is absent.

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#108)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#110)

Force refresh even if cache is valid

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#112)

Authentication token getter (uses Authorization: Bearer header)

**Returns**

`Promise`<`string` | `null`>
