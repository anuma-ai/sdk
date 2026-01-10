# UseModelsOptions

> **UseModelsOptions** = `object`

Defined in: src/react/useModels.ts:11

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: src/react/useModels.ts:27

Whether to fetch models automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: src/react/useModels.ts:19

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: src/react/useModels.ts:15

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### provider?

> `optional` **provider**: `string`

Defined in: src/react/useModels.ts:23

Optional filter for specific provider (e.g. "openai")
