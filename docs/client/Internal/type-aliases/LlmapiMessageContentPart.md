# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1187](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1187)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1188](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1188)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1189](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1189)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1193](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1193)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1197](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1197)

Type is the block type (`text`, `image_url`, or `input_file`)
