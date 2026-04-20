# LlmapiResponseInput

> **LlmapiResponseInput** = `object`

Defined in: [src/client/types.gen.ts:1844](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1844)

Input can be a simple text string or an array of messages for multi-turn conversations.
When continuing after client tool calls, pass the messages array from the previous response.

## Properties

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1848](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1848)

Messages is set when input is an array of messages (for multi-turn/tool continuations)

***

### text?

> `optional` **text**: `string`

Defined in: [src/client/types.gen.ts:1852](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1852)

Text is set when input is a simple string
