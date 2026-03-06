# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:1131](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1131)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:1135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1135)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:1136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1136)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:1140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1140)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:1144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1144)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1148](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1148)

Type is the message type (for Responses API: "message")
