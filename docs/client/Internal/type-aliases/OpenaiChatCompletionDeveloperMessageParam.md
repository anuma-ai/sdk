# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3173](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3173)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3174](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3174)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3175)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3176](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3176)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3182](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3182)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
