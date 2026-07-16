# OpenaiChatCompletionTokenLogprobTopLogprob

> **OpenaiChatCompletionTokenLogprobTopLogprob** = `object`

Defined in: [src/client/types.gen.ts:3971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3971)

## Properties

### bytes?

> `optional` **bytes**: `number`\[]

Defined in: [src/client/types.gen.ts:3978](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3978)

A list of integers representing the UTF-8 bytes representation of the token.
Useful in instances where characters are represented by multiple tokens and
their byte representations must be combined to generate the correct text
representation. Can be `null` if there is no bytes representation for the token.

***

### logprob?

> `optional` **logprob**: `number`

Defined in: [src/client/types.gen.ts:3984](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3984)

The log probability of this token, if it is within the top 20 most likely
tokens. Otherwise, the value `-9999.0` is used to signify that the token is very
unlikely.

***

### token?

> `optional` **token**: `string`

Defined in: [src/client/types.gen.ts:3988](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3988)

The token.
