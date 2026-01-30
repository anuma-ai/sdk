# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:437](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L437)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:441](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L441)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:442](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L442)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:446](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L446)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:450](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L450)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:454](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L454)

Type is the message type (for Responses API: "message")
