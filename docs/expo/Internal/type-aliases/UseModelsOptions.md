# UseModelsOptions

> **UseModelsOptions** = `object`

Defined in: [src/react/useModels.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#129)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useModels.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#145)

Whether to fetch models automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useModels.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#137)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useModels.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#133)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/react/useModels.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#141)

Optional filter for specific provider (e.g. "openai")
