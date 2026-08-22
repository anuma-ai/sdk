# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#527)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:528](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#528)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#529)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#533)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#537)

Type is the block type (`text`, `image_url`, or `input_file`)
