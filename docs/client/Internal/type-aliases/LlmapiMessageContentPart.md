# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:745](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L745)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:746](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L746)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:747](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L747)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:751](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L751)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:755](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L755)

Type is the block type (`text`, `image_url`, or `input_file`)
