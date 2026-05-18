# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:2098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2098)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:2099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2099)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:2100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2100)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:2104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2104)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:2108](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2108)

Type is the block type (`text`, `image_url`, or `input_file`)
