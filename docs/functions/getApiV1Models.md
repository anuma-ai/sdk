---
title: getApiV1Models
---

[@reverbia/sdk](../globals.md) / getApiV1Models

# Function: getApiV1Models()

> **getApiV1Models**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`\>

Defined in: [sdk.gen.ts:58](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/sdk.gen.ts#L58)

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
