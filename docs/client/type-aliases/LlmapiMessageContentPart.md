# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:440](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L440)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:441](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L441)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:442](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L442)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:446](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L446)

Text holds the text content when Type=text or Type=input_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:450](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L450)

Type is the block type (`text`, `image_url`, or `input_file`)
