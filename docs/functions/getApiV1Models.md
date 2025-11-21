---
title: getApiV1Models
---

[@reverbia/sdk](../globals.md) / getApiV1Models

# Function: getApiV1Models()

> **getApiV1Models**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`\>

Defined in: [sdk.gen.ts:58](https://github.com/zeta-chain/ai-sdk/blob/0cd445c1866e4dd9bc9f0cdef80865dce1529476/src/client/sdk.gen.ts#L58)

List available models

Returns a list of all available models from the configured gateway with optional filters.

## Type Parameters

### ThrowOnError

`ThrowOnError` *extends* `boolean` = `false`

## Parameters

### options?

[`Options`](../type-aliases/Options.md)\<[`GetApiV1ModelsData`](../type-aliases/GetApiV1ModelsData.md), `ThrowOnError`\>

## Returns

`RequestResult`\<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`\>
