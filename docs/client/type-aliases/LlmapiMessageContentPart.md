---
title: LlmapiMessageContentPart
---

[SDK Documentation](../../README.md) / [client](../README.md) / LlmapiMessageContentPart

# Type Alias: LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [client/types.gen.ts:325](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L325)

## Properties

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [client/types.gen.ts:326](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L326)

***

### text?

> `optional` **text**: `string`

Defined in: [client/types.gen.ts:330](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L330)

Text holds the text content when Type=text

***

### type?

> `optional` **type**: `string`

Defined in: [client/types.gen.ts:334](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L334)

Type is the block type (`text` or `image_url`)
