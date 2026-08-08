# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4468)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4472)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4473)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4477)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4478](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4478)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4482](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4482)

Total number of tokens used in the request (prompt + completion).
