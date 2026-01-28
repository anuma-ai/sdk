# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:493](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L493)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:494](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L494)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:495](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L495)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:499](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L499)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:503](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L503)

Type is the block type (`text`, `image_url`, or `input_file`)
