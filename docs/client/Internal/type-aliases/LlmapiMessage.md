# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:689](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L689)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:693](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L693)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:694](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L694)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:698](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L698)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:702](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L702)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:706](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L706)

Type is the message type (for Responses API: "message")
