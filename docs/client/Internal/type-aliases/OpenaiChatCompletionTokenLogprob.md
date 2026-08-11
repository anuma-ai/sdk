# OpenaiChatCompletionTokenLogprob

> **OpenaiChatCompletionTokenLogprob** = `object`

Defined in: [src/client/types.gen.ts:4346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4346)

## Properties

### bytes?

> `optional` **bytes**: `number`\[]

Defined in: [src/client/types.gen.ts:4353](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4353)

A list of integers representing the UTF-8 bytes representation of the token.
Useful in instances where characters are represented by multiple tokens and
their byte representations must be combined to generate the correct text
representation. Can be `null` if there is no bytes representation for the token.

***

### logprob?

> `optional` **logprob**: `number`

Defined in: [src/client/types.gen.ts:4359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4359)

The log probability of this token, if it is within the top 20 most likely
tokens. Otherwise, the value `-9999.0` is used to signify that the token is very
unlikely.

***

### token?

> `optional` **token**: `string`

Defined in: [src/client/types.gen.ts:4363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4363)

The token.

***

### top\_logprobs?

> `optional` **top\_logprobs**: [`OpenaiChatCompletionTokenLogprobTopLogprob`](OpenaiChatCompletionTokenLogprobTopLogprob.md)\[]

Defined in: [src/client/types.gen.ts:4369](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4369)

List of the most likely tokens and their log probability, at this token
position. In rare cases, there may be fewer than the number of requested
`top_logprobs` returned.
