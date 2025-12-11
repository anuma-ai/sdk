---
title: getApiV1Models
---

[SDK Documentation](../../README.md) / [client](../README.md) / getApiV1Models

# Function: getApiV1Models()

> **getApiV1Models**\<`ThrowOnError`\>(`options?`): `RequestResult`\<[`GetApiV1ModelsResponses`](../type-aliases/GetApiV1ModelsResponses.md), [`GetApiV1ModelsErrors`](../type-aliases/GetApiV1ModelsErrors.md), `ThrowOnError`\>

Defined in: [client/sdk.gen.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L74)

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
