---
title: getHealth
---

[@reverbia/sdk](../globals.md) / getHealth

# Function: getHealth()

> **getHealth**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>

Defined in: [sdk.gen.ts:58](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/sdk.gen.ts#L58)

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
