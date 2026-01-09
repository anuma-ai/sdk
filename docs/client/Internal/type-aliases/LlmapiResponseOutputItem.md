# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = { `arguments?`: `string`; `call_id?`: `string`; `content?`: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]; `id?`: `string`; `name?`: `string`; `role?`: `string`; `status?`: `string`; `summary?`: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]; `type?`: `string`; }

Defined in: [src/client/types.gen.ts:671](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L671)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:675](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L675)

Arguments is the function arguments for function\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:679](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L679)

CallID is the call ID for function\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:683](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L683)

Content is the content array for message and reasoning types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:687](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L687)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:691](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L691)

Name is the function name for function\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:695](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L695)

Role is the role for message types (e.g., "assistant")

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:699](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L699)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:703](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L703)

Summary is the reasoning summary for reasoning types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:707](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L707)

Type is the output item type (e.g., "message", "function\_call", "reasoning")
