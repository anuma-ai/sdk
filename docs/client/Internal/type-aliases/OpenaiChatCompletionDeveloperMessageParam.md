# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4072)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4073](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4073)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4074](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4074)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4075](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4075)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4081](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4081)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
