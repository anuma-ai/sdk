# LlmapiResponseInput

> **LlmapiResponseInput** = `string` | [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1464](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1464)

Input can be a simple text string or an array of messages for multi-turn conversations.
When continuing after client tool calls, pass the messages array from the previous response.
