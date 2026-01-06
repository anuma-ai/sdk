# LlmapiImageGenerationResponse

> **LlmapiImageGenerationResponse** = `object`

Defined in: [src/client/types.gen.ts:338](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L338)

## Properties

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:342](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L342)

Created is the Unix timestamp when the image was generated.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiImageGenerationExtraFields`](LlmapiImageGenerationExtraFields.md)

Defined in: [src/client/types.gen.ts:343](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L343)

***

### images?

> `optional` **images**: [`LlmapiImageGenerationImage`](LlmapiImageGenerationImage.md)[]

Defined in: [src/client/types.gen.ts:347](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L347)

Images contains the generated images.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:351](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L351)

Model is the model identifier that generated the image.

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:355](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L355)

Provider is the gateway that produced the image.

***

### usage?

> `optional` **usage**: [`LlmapiImageGenerationUsage`](LlmapiImageGenerationUsage.md)

Defined in: [src/client/types.gen.ts:356](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L356)
