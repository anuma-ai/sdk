# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1673](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1673)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1674)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1675](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1675)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1679](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1679)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1683](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1683)

Type is the block type (`text`, `image_url`, or `input_file`)
