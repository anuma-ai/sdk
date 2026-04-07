# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1707)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1708](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1708)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1709)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1713)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1717)

Type is the block type (`text`, `image_url`, or `input_file`)
