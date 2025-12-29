# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:569](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L569)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:573](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L573)

Arguments is the function arguments for function_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:577](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L577)

CallID is the call ID for function_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)[]

Defined in: [src/client/types.gen.ts:581](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L581)

Content is the content array for message and reasoning types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:585](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L585)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:589](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L589)

Name is the function name for function_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:593](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L593)

Role is the role for message types (e.g., "assistant")

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:597](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L597)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)[]

Defined in: [src/client/types.gen.ts:601](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L601)

Summary is the reasoning summary for reasoning types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:605](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L605)

Type is the output item type (e.g., "message", "function_call", "reasoning")
