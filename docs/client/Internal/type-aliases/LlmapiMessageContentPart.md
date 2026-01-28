# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:386](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L386)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:387](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L387)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:388](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L388)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:392](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L392)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:396](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L396)

Type is the block type (`text`, `image_url`, or `input_file`)
