# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:554](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#554)

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:558](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#558)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#559)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#563)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:567](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#567)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#571)

Type is the message type (for Responses API: "message")
