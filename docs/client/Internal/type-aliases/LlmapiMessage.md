# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:330](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L330)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:334](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L334)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:335](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L335)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:339](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L339)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:343](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L343)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:347](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L347)

Type is the message type (for Responses API: "message")
