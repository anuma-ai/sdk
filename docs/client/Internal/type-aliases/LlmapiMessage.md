# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:1617](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1617)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:1621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1621)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:1622](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1622)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:1626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1626)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:1630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1630)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1634](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1634)

Type is the message type (for Responses API: "message")
