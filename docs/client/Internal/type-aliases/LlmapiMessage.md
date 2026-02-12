# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:673](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L673)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:677](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L677)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:678](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L678)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:682](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L682)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:686](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L686)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:690](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L690)

Type is the message type (for Responses API: "message")
