# LlmapiResponseInput

> **LlmapiResponseInput** = `object`

Defined in: [src/client/types.gen.ts:759](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#759)

Input can be a simple text string or an array of messages for multi-turn conversations.
When continuing after client tool calls, pass the messages array from the previous response.

## Properties

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:763](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#763)

Messages is set when input is an array of messages (for multi-turn/tool continuations)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:767](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#767)

Text is set when input is a simple string
