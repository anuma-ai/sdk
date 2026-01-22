# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L55)

Options for fetching server tools

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L57)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L59)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L61)

Force refresh even if cache is valid

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L63)

Authentication token getter

**Returns**

`Promise`<`string` | `null`>
