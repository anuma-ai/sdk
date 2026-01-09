# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:422](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L422)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:426](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L426)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:427](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L427)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:431](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L431)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:435](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L435)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:439](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L439)

Type is the message type (for Responses API: "message")
