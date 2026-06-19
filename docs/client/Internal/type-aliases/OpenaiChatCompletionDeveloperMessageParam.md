# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3307)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3308)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3309)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3310](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3310)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3316](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3316)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
