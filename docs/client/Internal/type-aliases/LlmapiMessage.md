# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:1029](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1029)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:1033](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1033)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:1034](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1034)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:1038](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1038)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:1042](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1042)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1046](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1046)

Type is the message type (for Responses API: "message")
