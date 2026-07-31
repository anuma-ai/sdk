# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `Omit`<`GeneratedLlmapiChatCompletionResponse`, `"usage"`> & `object`

Defined in: [src/clientCompat.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/clientCompat.ts#101)

## Type Declaration

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

### image\_model?

> `optional` **image\_model**: `string`

### inference\_id?

> `optional` **inference\_id**: `string`

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)
