# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:724](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L724)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)\[]

Defined in: [src/client/types.gen.ts:728](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L728)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:729](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L729)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:733](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L733)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)\[]

Defined in: [src/client/types.gen.ts:737](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L737)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:741](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L741)

Type is the message type (for Responses API: "message")
