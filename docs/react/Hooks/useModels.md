# useModels

> **useModels**(`options`: { `autoFetch?`: `boolean`; `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `provider?`: `string`; }): [`UseModelsResult`](../../expo/Internal/type-aliases/UseModelsResult.md)

Defined in: [src/react/useModels.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useModels.ts#L42)

React hook for fetching available LLM models.
Automatically fetches all available models.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `autoFetch?`: `boolean`; `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `provider?`: `string`; } | - |
| `options.autoFetch?` | `boolean` | Whether to fetch models automatically on mount (default: true) |
| `options.baseUrl?` | `string` | Optional base URL for the API requests. |
| `options.getToken?` | () => `Promise`<`string` | `null`> | Custom function to get auth token for API calls |
| `options.provider?` | `string` | Optional filter for specific provider (e.g. "openai") |

## Returns

[`UseModelsResult`](../../expo/Internal/type-aliases/UseModelsResult.md)
