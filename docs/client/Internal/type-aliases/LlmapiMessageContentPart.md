# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:614](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L614)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:615](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L615)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:616](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L616)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:620](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L620)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:624](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L624)

Type is the block type (`text`, `image_url`, or `input_file`)
