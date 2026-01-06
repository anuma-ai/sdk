# postApiV1ChatCompletions()

> **postApiV1ChatCompletions**\<`ThrowOnError`\>(`options`: [`Options`](../type-aliases/Options.md)\<[`PostApiV1ChatCompletionsData`](../type-aliases/PostApiV1ChatCompletionsData.md), `ThrowOnError`\>): `RequestResult`\<[`PostApiV1ChatCompletionsResponses`](../type-aliases/PostApiV1ChatCompletionsResponses.md), [`PostApiV1ChatCompletionsErrors`](../type-aliases/PostApiV1ChatCompletionsErrors.md), `ThrowOnError`\>

Defined in: [src/client/sdk.gen.ts:26](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L26)

Create chat completion

Generates a chat completion using the configured gateway. Supports streaming when stream=true.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `ThrowOnError` *extends* `boolean` | `false` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`Options`](../type-aliases/Options.md)\<[`PostApiV1ChatCompletionsData`](../type-aliases/PostApiV1ChatCompletionsData.md), `ThrowOnError`\> |

## Returns

`RequestResult`\<[`PostApiV1ChatCompletionsResponses`](../type-aliases/PostApiV1ChatCompletionsResponses.md), [`PostApiV1ChatCompletionsErrors`](../type-aliases/PostApiV1ChatCompletionsErrors.md), `ThrowOnError`\>
