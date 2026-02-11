# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L101)

Options for fetching server tools

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/tools/serverTools.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L111)

Direct API key for server-side usage (uses X-API-Key header)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L103)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L105)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L107)

Force refresh even if cache is valid

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L109)

Authentication token getter (uses Authorization: Bearer header)

**Returns**

`Promise`<`string` | `null`>
