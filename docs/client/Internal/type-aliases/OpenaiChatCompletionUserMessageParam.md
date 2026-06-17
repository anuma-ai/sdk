# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3827](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3827)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3828](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3828)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3829)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3830)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3836](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3836)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
