# LlmapiMessageContentPart

> **LlmapiMessageContentPart** = `object`

Defined in: [src/client/types.gen.ts:729](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L729)

## Properties

### file?

> `optional` **file**: [`LlmapiMessageContentFile`](LlmapiMessageContentFile.md)

Defined in: [src/client/types.gen.ts:730](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L730)

***

### image\_url?

> `optional` **image\_url**: [`LlmapiMessageContentImage`](LlmapiMessageContentImage.md)

Defined in: [src/client/types.gen.ts:731](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L731)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:735](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L735)

Text holds the text content when Type=text or Type=input\_text

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:739](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L739)

Type is the block type (`text`, `image_url`, or `input_file`)
