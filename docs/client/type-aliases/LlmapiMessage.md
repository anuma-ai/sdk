# LlmapiMessage

> **LlmapiMessage** = `object`

Defined in: [src/client/types.gen.ts:366](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L366)

Message is the generated message

## Properties

### content?

> `optional` **content**: [`LlmapiMessageContentPart`](LlmapiMessageContentPart.md)[]

Defined in: [src/client/types.gen.ts:370](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L370)

Content is the message content

***

### role?

> `optional` **role**: [`LlmapiRole`](LlmapiRole.md)

Defined in: [src/client/types.gen.ts:371](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L371)

***

### tool\_calls?

> `optional` **tool\_calls**: [`LlmapiToolCall`](LlmapiToolCall.md)[]

Defined in: [src/client/types.gen.ts:375](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L375)

ToolCalls contains tool/function calls made by the assistant (only for assistant role)
