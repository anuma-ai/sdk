# LlmapiImageGenerationResponse

> **LlmapiImageGenerationResponse** = `object`

Defined in: [client/types.gen.ts:257](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L257)

## Properties

### created?

> `optional` **created**: `number`

Defined in: [client/types.gen.ts:261](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L261)

Created is the Unix timestamp when the image was generated.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiImageGenerationExtraFields`](LlmapiImageGenerationExtraFields.md)

Defined in: [client/types.gen.ts:262](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L262)

***

### images?

> `optional` **images**: [`LlmapiImageGenerationImage`](LlmapiImageGenerationImage.md)[]

Defined in: [client/types.gen.ts:266](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L266)

Images contains the generated images.

***

### model?

> `optional` **model**: `string`

Defined in: [client/types.gen.ts:270](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L270)

Model is the model identifier that generated the image.

***

### provider?

> `optional` **provider**: `string`

Defined in: [client/types.gen.ts:274](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L274)

Provider is the gateway that produced the image.

***

### usage?

> `optional` **usage**: [`LlmapiImageGenerationUsage`](LlmapiImageGenerationUsage.md)

Defined in: [client/types.gen.ts:275](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L275)
