# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:479](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#479)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:480](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#480)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:481](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#481)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:485](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#485)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#489)

Type is the block type (`text`, `image_url`, or `input_file`)
