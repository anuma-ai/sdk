# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:658](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L658)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:659](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L659)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:660](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L660)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:664](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L664)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:668](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L668)

Type is the block type (`text`, `image_url`, or `input_file`)
