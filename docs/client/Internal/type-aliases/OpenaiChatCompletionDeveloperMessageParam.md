# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4151)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4152](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4152)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4153](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4153)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4154)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4160](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4160)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
