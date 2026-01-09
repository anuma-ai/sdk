# useImageGeneration()

> **useImageGeneration**(`options`: { `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onError?`: (`error`: `Error`) => `void`; `onFinish?`: (`response`: [`LlmapiImageGenerationResponse`](../../client/Internal/type-aliases/LlmapiImageGenerationResponse.md)) => `void`; }): `UseImageGenerationResult`

Defined in: [src/react/useImageGeneration.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useImageGeneration.ts#L49)

React hook for generating images using the LLM API.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onError?`: (`error`: `Error`) => `void`; `onFinish?`: (`response`: [`LlmapiImageGenerationResponse`](../../client/Internal/type-aliases/LlmapiImageGenerationResponse.md)) => `void`; } | - |
| `options.baseUrl?` | `string` | Optional base URL for the API requests. |
| `options.getToken?` | () => `Promise`<`string` | `null`> | Custom function to get auth token for API calls |
| `options.onError?` | (`error`: `Error`) => `void` | Callback function to be called when an unexpected error is encountered. |
| `options.onFinish?` | (`response`: [`LlmapiImageGenerationResponse`](../../client/Internal/type-aliases/LlmapiImageGenerationResponse.md)) => `void` | Callback function to be called when the generation finishes successfully. |

## Returns

`UseImageGenerationResult`
