# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4444)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4445)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4446](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4446)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4447](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4447)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4453)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
