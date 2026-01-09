# LlmapiResponseInput

> **LlmapiResponseInput** = { `messages?`: [`LlmapiMessage`](LlmapiMessage.md)\[]; `text?`: `string`; }

Defined in: [src/client/types.gen.ts:649](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L649)

Input can be a simple text string or an array of messages for multi-turn conversations.
When continuing after client tool calls, pass the messages array from the previous response.

## Properties

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:653](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L653)

Messages is set when input is an array of messages (for multi-turn/tool continuations)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:657](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L657)

Text is set when input is a simple string
