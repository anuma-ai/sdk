# getHealth()

> **getHealth**\<`ThrowOnError`\>(`options?`: [`Options`](../type-aliases/Options.md)\<[`GetHealthData`](../type-aliases/GetHealthData.md), `ThrowOnError`\>): `RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>

Defined in: [src/client/sdk.gen.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L190)

Health check

Returns the current health status of the service.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `ThrowOnError` *extends* `boolean` | `false` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`Options`](../type-aliases/Options.md)\<[`GetHealthData`](../type-aliases/GetHealthData.md), `ThrowOnError`\> |

## Returns

`RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>
