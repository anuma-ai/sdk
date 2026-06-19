# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#497)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:498](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#498)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:499](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#499)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#503)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:507](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#507)

Type is the block type (`text`, `image_url`, or `input_file`)
