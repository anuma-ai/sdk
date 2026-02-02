# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:558](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L558)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:562](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L562)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:563](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L563)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:567](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L567)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:571](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L571)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:575](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L575)

Type is the message type (for Responses API: "message")
