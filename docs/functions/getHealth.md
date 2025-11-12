---
title: getHealth
---

[**ai-sdk**](../README.md)

***

[ai-sdk](../README.md) / getHealth

# Function: getHealth()

> **getHealth**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>

Defined in: [sdk.gen.ts:42](https://github.com/zeta-chain/ai-sdk/blob/5c8e243af9a466a50f7d4fa3d6a0b9627b185419/src/client/sdk.gen.ts#L42)

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
