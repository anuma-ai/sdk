# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:440](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#440)

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#444)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#445)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#449)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#453)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#457)

Type is the message type (for Responses API: "message")
