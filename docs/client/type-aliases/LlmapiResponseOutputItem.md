# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:633](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L633)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:637](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L637)

Arguments is the function arguments for function_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:641](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L641)

CallID is the call ID for function_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)[]

Defined in: [src/client/types.gen.ts:645](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L645)

Content is the content array for message and reasoning types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:649](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L649)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:653](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L653)

Name is the function name for function_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:657](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L657)

Role is the role for message types (e.g., "assistant")

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:661](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L661)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)[]

Defined in: [src/client/types.gen.ts:665](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L665)

Summary is the reasoning summary for reasoning types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:669](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L669)

Type is the output item type (e.g., "message", "function_call", "reasoning")
