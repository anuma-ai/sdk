# OpenaiChatCompletionTokenLogprob

> **OpenaiChatCompletionTokenLogprob** = `object`

Defined in: [src/client/types.gen.ts:3958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3958)

## Properties

### bytes?

> `optional` **bytes**: `number`\[]

Defined in: [src/client/types.gen.ts:3965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3965)

A list of integers representing the UTF-8 bytes representation of the token.
Useful in instances where characters are represented by multiple tokens and
their byte representations must be combined to generate the correct text
representation. Can be `null` if there is no bytes representation for the token.

***

### logprob?

> `optional` **logprob**: `number`

Defined in: [src/client/types.gen.ts:3971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3971)

The log probability of this token, if it is within the top 20 most likely
tokens. Otherwise, the value `-9999.0` is used to signify that the token is very
unlikely.

***

### token?

> `optional` **token**: `string`

Defined in: [src/client/types.gen.ts:3975](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3975)

The token.

***

### top\_logprobs?

> `optional` **top\_logprobs**: [`OpenaiChatCompletionTokenLogprobTopLogprob`](OpenaiChatCompletionTokenLogprobTopLogprob.md)\[]

Defined in: [src/client/types.gen.ts:3981](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3981)

List of the most likely tokens and their log probability, at this token
position. In rare cases, there may be fewer than the number of requested
`top_logprobs` returned.
