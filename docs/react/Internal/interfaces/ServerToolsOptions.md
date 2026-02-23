# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L98)

Options for fetching server tools

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/tools/serverTools.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L108)

Direct API key for server-side usage (uses X-API-Key header)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L100)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L102)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L104)

Force refresh even if cache is valid

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L106)

Authentication token getter (uses Authorization: Bearer header)

**Returns**

`Promise`<`string` | `null`>
