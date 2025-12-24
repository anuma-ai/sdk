# LlmapiImageGenerationResponse

> **LlmapiImageGenerationResponse** = `object`

Defined in: [src/client/types.gen.ts:320](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L320)

## Properties

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:324](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L324)

Created is the Unix timestamp when the image was generated.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiImageGenerationExtraFields`](LlmapiImageGenerationExtraFields.md)

Defined in: [src/client/types.gen.ts:325](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L325)

***

### images?

> `optional` **images**: [`LlmapiImageGenerationImage`](LlmapiImageGenerationImage.md)[]

Defined in: [src/client/types.gen.ts:329](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L329)

Images contains the generated images.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:333](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L333)

Model is the model identifier that generated the image.

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:337](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L337)

Provider is the gateway that produced the image.

***

### usage?

> `optional` **usage**: [`LlmapiImageGenerationUsage`](LlmapiImageGenerationUsage.md)

Defined in: [src/client/types.gen.ts:338](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L338)
