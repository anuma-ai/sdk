# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3743)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3744)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3745)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3746)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3752](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3752)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
