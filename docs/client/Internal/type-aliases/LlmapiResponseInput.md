# LlmapiResponseInput

> **LlmapiResponseInput** = `object`

Defined in: [src/client/types.gen.ts:900](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L900)

Input can be a simple text string or an array of messages for multi-turn conversations.
When continuing after client tool calls, pass the messages array from the previous response.

## Properties

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:904](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L904)

Messages is set when input is an array of messages (for multi-turn/tool continuations)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:908](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L908)

Text is set when input is a simple string
