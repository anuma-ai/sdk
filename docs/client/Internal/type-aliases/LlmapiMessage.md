# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:1237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1237)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:1241](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1241)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:1242](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1242)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:1246](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1246)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:1250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1250)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1254](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1254)

Type is the message type (for Responses API: "message")
