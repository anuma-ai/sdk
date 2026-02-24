# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:780](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#780)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:781](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#781)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:782](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#782)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:786](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#786)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:790](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#790)

Type is the block type (`text`, `image_url`, or `input_file`)
