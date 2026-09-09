# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#610)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:611](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#611)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:612](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#612)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:616](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#616)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:620](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#620)

Type is the block type (`text`, `image_url`, or `input_file`)
