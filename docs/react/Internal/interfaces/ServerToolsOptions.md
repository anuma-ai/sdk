# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L79)

Options for fetching server tools

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L81)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L83)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L85)

Force refresh even if cache is valid

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L87)

Authentication token getter

**Returns**

`Promise`<`string` | `null`>
