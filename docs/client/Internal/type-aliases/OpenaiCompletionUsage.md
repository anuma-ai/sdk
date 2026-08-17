# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4616](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4616)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4620](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4620)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4621)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4625](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4625)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4626)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4630)

Total number of tokens used in the request (prompt + completion).
