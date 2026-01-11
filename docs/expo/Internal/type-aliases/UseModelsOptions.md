# UseModelsOptions

> **UseModelsOptions** = `object`

Defined in: [src/react/useModels.ts:11](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useModels.ts#L11)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useModels.ts:27](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useModels.ts#L27)

Whether to fetch models automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useModels.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useModels.ts#L19)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useModels.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useModels.ts#L15)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/react/useModels.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useModels.ts#L23)

Optional filter for specific provider (e.g. "openai")
