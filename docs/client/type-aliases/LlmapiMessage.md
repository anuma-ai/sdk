# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:384](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L384)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)[]

Defined in: [src/client/types.gen.ts:388](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L388)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:389](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L389)

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:393](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L393)

ToolCallID is the ID of the tool call this message is responding to (only for tool role)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)[]

Defined in: [src/client/types.gen.ts:397](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L397)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:401](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L401)

Type is the message type (for Responses API: "message")
