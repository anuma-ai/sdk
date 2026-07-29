# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4117](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4117)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4118](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4118)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4119)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4120)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4126](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4126)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
