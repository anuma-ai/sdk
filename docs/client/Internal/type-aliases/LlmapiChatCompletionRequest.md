# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L154)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L158)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L162)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:166](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L166)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiToolChoice`](LlmapiToolChoice.md)

Defined in: [src/client/types.gen.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L167)

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)\[]

Defined in: [src/client/types.gen.ts:171](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L171)

Tools is an array of tool definitions the model can use
