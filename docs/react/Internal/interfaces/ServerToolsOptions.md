# ServerToolsOptions

Defined in: [src/lib/tools/serverTools.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L89)

Options for fetching server tools

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/tools/serverTools.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L91)

Base URL for the API (defaults to BASE\_URL from clientConfig)

***

### cacheExpirationMs?

> `optional` **cacheExpirationMs**: `number`

Defined in: [src/lib/tools/serverTools.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L93)

Cache expiration time in milliseconds (default: 5 minutes)

***

### forceRefresh?

> `optional` **forceRefresh**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L95)

Force refresh even if cache is valid

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/tools/serverTools.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L97)

Authentication token getter

**Returns**

`Promise`<`string` | `null`>
