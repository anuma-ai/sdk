# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3531](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3531)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3532)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3533)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3534](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3534)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3540)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
