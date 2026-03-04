# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1141)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1142)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1143)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1147](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1147)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1151)

Type is the block type (`text`, `image_url`, or `input_file`)
