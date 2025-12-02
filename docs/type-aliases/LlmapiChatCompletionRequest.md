---
title: LlmapiChatCompletionRequest
---

[@reverbia/sdk](../globals.md) / LlmapiChatCompletionRequest

# Type Alias: LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [types.gen.ts:44](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L44)

## Properties

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [types.gen.ts:48](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L48)

Messages is the conversation history

***

### model?

> `optional` **model**: `string`

Defined in: [types.gen.ts:52](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L52)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [types.gen.ts:56](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L56)

Stream indicates if response should be streamed
