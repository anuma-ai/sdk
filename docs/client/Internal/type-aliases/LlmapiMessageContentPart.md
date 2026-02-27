# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:1029](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1029)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:1030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1030)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:1031](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1031)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1035)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1039](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1039)

Type is the block type (`text`, `image_url`, or `input_file`)
