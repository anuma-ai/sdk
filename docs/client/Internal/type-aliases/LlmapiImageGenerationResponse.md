# LlmapiImageGenerationResponse

> **LlmapiImageGenerationResponse** = `object`

Defined in: src/client/types.gen.ts:376

## Properties

### created?

> `optional` **created**: `number`

Defined in: src/client/types.gen.ts:380

Created is the Unix timestamp when the image was generated.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiImageGenerationExtraFields`](LlmapiImageGenerationExtraFields.md)

Defined in: src/client/types.gen.ts:381

***

### images?

> `optional` **images**: [`LlmapiImageGenerationImage`](LlmapiImageGenerationImage.md)\[]

Defined in: src/client/types.gen.ts:385

Images contains the generated images.

***

### model?

> `optional` **model**: `string`

Defined in: src/client/types.gen.ts:389

Model is the model identifier that generated the image.

***

### provider?

> `optional` **provider**: `string`

Defined in: src/client/types.gen.ts:393

Provider is the gateway that produced the image.

***

### usage?

> `optional` **usage**: [`LlmapiImageGenerationUsage`](LlmapiImageGenerationUsage.md)

Defined in: src/client/types.gen.ts:394
