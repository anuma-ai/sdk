# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#496)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#497)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:498](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#498)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:502](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#502)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:506](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#506)

Type is the block type (`text`, `image_url`, or `input_file`)
