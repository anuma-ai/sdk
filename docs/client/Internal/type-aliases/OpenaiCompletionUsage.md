# OpenaiCompletionUsage

> **OpenaiCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:3922](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3922)

Usage statistics for the completion request.

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3926)

Number of tokens in the generated completion.

***

### completion\_tokens\_details?

> `optional` **completion\_tokens\_details**: [`OpenaiCompletionUsageCompletionTokensDetails`](OpenaiCompletionUsageCompletionTokensDetails.md)

Defined in: [src/client/types.gen.ts:3927](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3927)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3931](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3931)

Number of tokens in the prompt.

***

### prompt\_tokens\_details?

> `optional` **prompt\_tokens\_details**: [`OpenaiCompletionUsagePromptTokensDetails`](OpenaiCompletionUsagePromptTokensDetails.md)

Defined in: [src/client/types.gen.ts:3932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3932)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:3936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3936)

Total number of tokens used in the request (prompt + completion).
