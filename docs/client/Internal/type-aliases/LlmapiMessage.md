# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:665](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L665)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:669](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L669)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:670](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L670)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:674](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L674)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:678](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L678)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:682](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L682)

Type is the message type (for Responses API: "message")
