---
title: LlmapiChatCompletionExtraFields
---

[@reverbia/sdk](../globals.md) / LlmapiChatCompletionExtraFields

# Type Alias: LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [types.gen.ts:25](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L25)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [types.gen.ts:29](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L29)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [types.gen.ts:33](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L33)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [types.gen.ts:37](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L37)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [types.gen.ts:41](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L41)

RequestType is always "chat_completion"
