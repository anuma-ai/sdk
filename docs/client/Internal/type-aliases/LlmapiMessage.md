# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:1199](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1199)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:1203](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1203)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:1204](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1204)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:1208](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1208)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:1212](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1212)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1216](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1216)

Type is the message type (for Responses API: "message")
