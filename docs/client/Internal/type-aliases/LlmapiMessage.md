# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:417](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#417)

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:421](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#421)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:422](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#422)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#426)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:430](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#430)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:434](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#434)

Type is the message type (for Responses API: "message")
