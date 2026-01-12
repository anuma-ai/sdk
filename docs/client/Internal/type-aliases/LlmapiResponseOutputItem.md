# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:579](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L579)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:583](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L583)

Arguments is the function arguments for function\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:587](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L587)

CallID is the call ID for function\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:591](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L591)

Content is the content array for message and reasoning types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:595](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L595)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:599](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L599)

Name is the function name for function\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:603](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L603)

Role is the role for message types (e.g., "assistant")

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:607](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L607)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:611](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L611)

Summary is the reasoning summary for reasoning types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:615](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L615)

Type is the output item type (e.g., "message", "function\_call", "reasoning")
