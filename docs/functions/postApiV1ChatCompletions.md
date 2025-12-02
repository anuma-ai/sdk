---
title: postApiV1ChatCompletions
---

[@reverbia/sdk](../globals.md) / postApiV1ChatCompletions

# Function: postApiV1ChatCompletions()

> **postApiV1ChatCompletions**\<`ThrowOnError`\>(`options`): `RequestResult`\<[`PostApiV1ChatCompletionsResponses`](../type-aliases/PostApiV1ChatCompletionsResponses.md), [`PostApiV1ChatCompletionsErrors`](../type-aliases/PostApiV1ChatCompletionsErrors.md), `ThrowOnError`\>

Defined in: [sdk.gen.ts:26](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/sdk.gen.ts#L26)

Create chat completion

Generates a chat completion using the configured gateway. Supports streaming when stream=true.

## Type Parameters

### ThrowOnError

`ThrowOnError` *extends* `boolean` = `false`

## Parameters

### options

[`Options`](../type-aliases/Options.md)\<[`PostApiV1ChatCompletionsData`](../type-aliases/PostApiV1ChatCompletionsData.md), `ThrowOnError`\>

## Returns

`RequestResult`\<[`PostApiV1ChatCompletionsResponses`](../type-aliases/PostApiV1ChatCompletionsResponses.md), [`PostApiV1ChatCompletionsErrors`](../type-aliases/PostApiV1ChatCompletionsErrors.md), `ThrowOnError`\>
