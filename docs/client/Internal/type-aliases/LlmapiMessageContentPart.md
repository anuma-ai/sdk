# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1293](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1293)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1294)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1295)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1299](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1299)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1303)

Type is the block type (`text`, `image_url`, or `input_file`)
