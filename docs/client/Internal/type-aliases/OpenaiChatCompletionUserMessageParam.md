# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3969)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3970](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3970)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3971)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3972](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3972)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3978](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3978)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
