# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:392](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L392)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:396](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L396)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:400](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L400)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:404](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L404)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:405](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L405)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:409](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L409)

Tools is an array of tool schemas describing which tools the model can use
