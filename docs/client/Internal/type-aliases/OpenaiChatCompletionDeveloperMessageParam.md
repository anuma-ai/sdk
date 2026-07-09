# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3486](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3486)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3487](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3487)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3488)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3489)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3495](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3495)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
