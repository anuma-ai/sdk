---
title: getHealth
---

[@reverbia/sdk](../globals.md) / getHealth

# Function: getHealth()

> **getHealth**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>

Defined in: [sdk.gen.ts:42](https://github.com/zeta-chain/ai-sdk/blob/7b3c0ee35ca9a53718ad47bed65de7f375915d06/src/client/sdk.gen.ts#L42)

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
