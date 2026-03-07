# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1255](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1255)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1256)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1257)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1261](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1261)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1265](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1265)

Type is the block type (`text`, `image_url`, or `input_file`)
