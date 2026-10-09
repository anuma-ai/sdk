# UseModelsOptions

> **UseModelsOptions** = `object`

Defined in: [src/react/useModels.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#204)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useModels.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#220)

Whether to fetch models automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useModels.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#212)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useModels.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#208)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/react/useModels.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#216)

Optional filter for specific provider (e.g. "openai")
