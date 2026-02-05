# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:602](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L602)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:606](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L606)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:607](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L607)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:611](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L611)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:615](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L615)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:619](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L619)

Type is the message type (for Responses API: "message")
