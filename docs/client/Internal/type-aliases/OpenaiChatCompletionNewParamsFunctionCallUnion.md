# OpenaiChatCompletionNewParamsFunctionCallUnion

> **OpenaiChatCompletionNewParamsFunctionCallUnion** = `object`

Defined in: [src/client/types.gen.ts:3802](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3802)

Deprecated in favor of `tool_choice`.

Controls which (if any) function is called by the model.

`none` means the model will not call a function and instead generates a message.

`auto` means the model can pick between generating a message or calling a
function.

Specifying a particular function via `{"name": "my_function"}` forces the model
to call that function.

`none` is the default when no functions are present. `auto` is the default if
functions are present.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3803](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3803)

***

### ofFunctionCallMode?

> `optional` **ofFunctionCallMode**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3804)

***

### ofFunctionCallOption?

> `optional` **ofFunctionCallOption**: [`OpenaiChatCompletionFunctionCallOptionParam`](OpenaiChatCompletionFunctionCallOptionParam.md)

Defined in: [src/client/types.gen.ts:3805](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3805)
