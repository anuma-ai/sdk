# getHealth()

> **getHealth**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>

Defined in: [src/client/sdk.gen.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L102)

Health check

Returns the current health status of the service.

## Type Parameters

### ThrowOnError

`ThrowOnError` *extends* `boolean` = `false`

## Parameters

### options?

[`Options`](../type-aliases/Options.md)\<[`GetHealthData`](../type-aliases/GetHealthData.md), `ThrowOnError`\>

## Returns

`RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>
