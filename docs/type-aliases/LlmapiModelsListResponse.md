---
title: LlmapiModelsListResponse
---

[@reverbia/sdk](../globals.md) / LlmapiModelsListResponse

# Type Alias: LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [types.gen.ts:453](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L453)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [types.gen.ts:457](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L457)

Data contains the list of available models

---

### extra_fields?

> `optional` **extra_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [types.gen.ts:458](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L458)

---

### next_page_token?

> `optional` **next_page_token**: `string`

Defined in: [types.gen.ts:462](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L462)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
