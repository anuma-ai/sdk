# UseModelsOptions

> **UseModelsOptions** = `object`

Defined in: [src/react/useModels.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#226)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useModels.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#242)

Whether to fetch models automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useModels.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#234)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useModels.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#230)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/react/useModels.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#238)

Optional filter for specific provider (e.g. "openai")
