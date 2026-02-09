# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:721](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L721)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:722](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L722)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:723](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L723)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:727](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L727)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:731](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L731)

Type is the block type (`text`, `image_url`, or `input_file`)
