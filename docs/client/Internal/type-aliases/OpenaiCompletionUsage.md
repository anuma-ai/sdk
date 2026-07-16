# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4067](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4067)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4071](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4071)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4072)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4076)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4077](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4077)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4081](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4081)

Total number of tokens used in the request (prompt + completion).
