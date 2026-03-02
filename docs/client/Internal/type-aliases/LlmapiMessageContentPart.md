# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#829)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#830)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:831](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#831)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#835)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:839](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#839)

Type is the block type (`text`, `image_url`, or `input_file`)
