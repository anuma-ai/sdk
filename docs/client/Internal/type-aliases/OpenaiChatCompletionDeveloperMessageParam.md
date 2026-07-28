# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3567](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3567)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3568](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3568)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3569](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3569)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3570)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3576](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3576)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
