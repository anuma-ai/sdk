# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:339](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L339)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)[]

Defined in: [src/client/types.gen.ts:343](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L343)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:344](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L344)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)[]

Defined in: [src/client/types.gen.ts:348](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L348)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)
