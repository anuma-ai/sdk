---
title: getHealth
---

[@reverbia/sdk](../globals.md) / getHealth

# Function: getHealth()

> **getHealth**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetHealthResponses`](../type-aliases/GetHealthResponses.md), [`GetHealthErrors`](../type-aliases/GetHealthErrors.md), `ThrowOnError`\>

Defined in: [sdk.gen.ts:70](https://github.com/zeta-chain/ai-sdk/blob/0cd445c1866e4dd9bc9f0cdef80865dce1529476/src/client/sdk.gen.ts#L70)

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
