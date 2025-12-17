# LlmapiImageGenerationResponse

> **LlmapiImageGenerationResponse** = `object`

Defined in: [src/client/types.gen.ts:293](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L293)

## Properties

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:297](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L297)

Created is the Unix timestamp when the image was generated.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiImageGenerationExtraFields`](LlmapiImageGenerationExtraFields.md)

Defined in: [src/client/types.gen.ts:298](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L298)

***

### images?

> `optional` **images**: [`LlmapiImageGenerationImage`](LlmapiImageGenerationImage.md)[]

Defined in: [src/client/types.gen.ts:302](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L302)

Images contains the generated images.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:306](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L306)

Model is the model identifier that generated the image.

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:310](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L310)

Provider is the gateway that produced the image.

***

### usage?

> `optional` **usage**: [`LlmapiImageGenerationUsage`](LlmapiImageGenerationUsage.md)

Defined in: [src/client/types.gen.ts:311](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L311)
