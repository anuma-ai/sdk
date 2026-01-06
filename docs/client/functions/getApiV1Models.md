# getApiV1Models()

> **getApiV1Models**\<`ThrowOnError`\>(`options?`: [`Options`](../type-aliases/Options.md)\<[`GetApiV1ModelsData`](../type-aliases/GetApiV1ModelsData.md), `ThrowOnError`\>): `RequestResult`\<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`\>

Defined in: [src/client/sdk.gen.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L98)

List available models

Returns a list of all available models from the configured gateway with optional filters. Models include modality information indicating their capabilities (e.g., llm, embedding, vision, image, audio, reasoning, code, reranker, multimodal, video).

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `ThrowOnError` *extends* `boolean` | `false` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`Options`](../type-aliases/Options.md)\<[`GetApiV1ModelsData`](../type-aliases/GetApiV1ModelsData.md), `ThrowOnError`\> |

## Returns

`RequestResult`\<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`\>
