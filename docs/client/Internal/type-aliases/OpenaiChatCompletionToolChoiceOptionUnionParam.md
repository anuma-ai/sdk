# OpenaiChatCompletionToolChoiceOptionUnionParam

> **OpenaiChatCompletionToolChoiceOptionUnionParam** = `object`

Defined in: [src/client/types.gen.ts:4002](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4002)

Controls which (if any) tool is called by the model. `none` means the model will
not call any tool and instead generates a message. `auto` means the model can
pick between generating a message or calling one or more tools. `required` means
the model must call one or more tools. Specifying a particular tool via
`{"type": "function", "function": {"name": "my_function"}}` forces the model to
call that tool.

`none` is the default when no tools are present. `auto` is the default if tools
are present.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4003](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4003)

***

### ofAuto?

> `optional` **ofAuto**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4004)

***

### ofChatCompletionNamedToolChoice?

> `optional` **ofChatCompletionNamedToolChoice**: [`OpenaiChatCompletionNamedToolChoiceParam`](OpenaiChatCompletionNamedToolChoiceParam.md)

Defined in: [src/client/types.gen.ts:4005](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4005)
