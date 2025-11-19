---
title: LlmapiModelsListResponse
---

[@reverbia/sdk](../globals.md) / LlmapiModelsListResponse

# Type Alias: LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [types.gen.ts:324](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L324)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [types.gen.ts:328](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L328)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [types.gen.ts:329](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L329)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [types.gen.ts:333](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L333)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
