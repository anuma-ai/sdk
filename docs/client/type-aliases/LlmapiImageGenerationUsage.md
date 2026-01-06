# LlmapiImageGenerationUsage

> **LlmapiImageGenerationUsage** = \{ `cost_micro_usd?`: `number`; `input_tokens?`: `number`; `output_tokens?`: `number`; `total_tokens?`: `number`; \}

Defined in: [src/client/types.gen.ts:400](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L400)

Usage documents token usage (when available).

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:404](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L404)

CostMicroUSD is the inference cost for this image generation request

***

### input\_tokens?

> `optional` **input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:408](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L408)

InputTokens is the number of tokens sent in the prompt.

***

### output\_tokens?

> `optional` **output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:412](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L412)

OutputTokens is the number of tokens returned by the model.

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:416](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L416)

TotalTokens is the total number of tokens consumed.
