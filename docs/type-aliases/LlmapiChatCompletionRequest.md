---
title: LlmapiChatCompletionRequest
---

[@reverbia/sdk](../globals.md) / LlmapiChatCompletionRequest

# Type Alias: LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [types.gen.ts:22](https://github.com/zeta-chain/ai-sdk/blob/7b3c0ee35ca9a53718ad47bed65de7f375915d06/src/client/types.gen.ts#L22)

## Properties

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [types.gen.ts:26](https://github.com/zeta-chain/ai-sdk/blob/7b3c0ee35ca9a53718ad47bed65de7f375915d06/src/client/types.gen.ts#L26)

Messages is the conversation history

***

### model?

> `optional` **model**: `string`

Defined in: [types.gen.ts:30](https://github.com/zeta-chain/ai-sdk/blob/7b3c0ee35ca9a53718ad47bed65de7f375915d06/src/client/types.gen.ts#L30)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [types.gen.ts:34](https://github.com/zeta-chain/ai-sdk/blob/7b3c0ee35ca9a53718ad47bed65de7f375915d06/src/client/types.gen.ts#L34)

Stream indicates if response should be streamed
