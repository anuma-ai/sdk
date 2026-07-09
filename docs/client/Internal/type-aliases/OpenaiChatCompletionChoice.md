# OpenaiChatCompletionChoice

> **OpenaiChatCompletionChoice** = `object`

Defined in: [src/client/types.gen.ts:3347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3347)

## Properties

### finish\_reason?

> `optional` **finish\_reason**: `string`

Defined in: [src/client/types.gen.ts:3358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3358)

The reason the model stopped generating tokens. This will be `stop` if the model
hit a natural stop point or a provided stop sequence, `length` if the maximum
number of tokens specified in the request was reached, `content_filter` if
content was omitted due to a flag from our content filters, `tool_calls` if the
model called a tool, or `function_call` (deprecated) if the model called a
function.

Any of "stop", "length", "tool\_calls", "content\_filter", "function\_call".

***

### index?

> `optional` **index**: `number`

Defined in: [src/client/types.gen.ts:3362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3362)

The index of the choice in the list of choices.

***

### logprobs?

> `optional` **logprobs**: [`OpenaiChatCompletionChoiceLogprobs`](OpenaiChatCompletionChoiceLogprobs.md)

Defined in: [src/client/types.gen.ts:3363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3363)

***

### message?

> `optional` **message**: [`OpenaiChatCompletionMessage`](OpenaiChatCompletionMessage.md)

Defined in: [src/client/types.gen.ts:3364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3364)
