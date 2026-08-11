# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4477)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4478](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4478)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4479](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4479)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4480](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4480)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4486](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4486)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
