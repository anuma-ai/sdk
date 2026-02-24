# UseModelsOptions

> **UseModelsOptions** = `object`

Defined in: [src/react/useModels.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#12)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useModels.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#28)

Whether to fetch models automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useModels.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#20)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useModels.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#16)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/react/useModels.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#24)

Optional filter for specific provider (e.g. "openai")
