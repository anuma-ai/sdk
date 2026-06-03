# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#423)

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#427)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#428)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#432)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:436](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#436)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:440](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#440)

Type is the message type (for Responses API: "message")
