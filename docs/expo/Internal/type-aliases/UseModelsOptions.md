# UseModelsOptions

> **UseModelsOptions** = `object`

Defined in: [src/react/useModels.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#152)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useModels.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#168)

Whether to fetch models automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useModels.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#160)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useModels.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#156)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/react/useModels.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#164)

Optional filter for specific provider (e.g. "openai")
