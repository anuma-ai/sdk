# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1085)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1086)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1087)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1091](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1091)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1095](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1095)

Type is the block type (`text`, `image_url`, or `input_file`)
