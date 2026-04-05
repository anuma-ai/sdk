# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1714](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1714)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1715)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1716](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1716)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1720](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1720)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1724](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1724)

Type is the block type (`text`, `image_url`, or `input_file`)
