# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L88)

Options for fetching server tools

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L90)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L92)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L94)

Force refresh even if cache is valid

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L96)

Authentication token getter

**Returns**

`Promise`<`string` | `null`>
