# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:4133](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4133)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4137)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:4138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4138)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4142)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:4143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4143)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:4147](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4147)

Total number of tokens used in the request (prompt + completion).
