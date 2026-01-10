# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: src/client/types.gen.ts:478

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: src/client/types.gen.ts:479

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: src/client/types.gen.ts:480

***

### text?

> `optional` **text**: `string`

Defined in: src/client/types.gen.ts:484

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: src/client/types.gen.ts:488

Type is the block type (`text`, `image_url`, or `input_file`)
