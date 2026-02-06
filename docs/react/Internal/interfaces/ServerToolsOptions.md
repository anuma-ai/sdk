# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L92)

Options for fetching server tools

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L94)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L96)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L98)

Force refresh even if cache is valid

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L100)

Authentication token getter

**Returns**

`Promise`<`string` | `null`>
