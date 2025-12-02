---
title: LlmapiModelsListResponse
---

[@reverbia/sdk](../globals.md) / LlmapiModelsListResponse

# Type Alias: LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [types.gen.ts:332](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L332)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [types.gen.ts:336](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L336)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [types.gen.ts:337](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L337)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [types.gen.ts:341](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L341)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
