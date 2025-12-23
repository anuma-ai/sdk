# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:542](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L542)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:546](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L546)

Arguments is the function arguments for function_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:550](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L550)

CallID is the call ID for function_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)[]

Defined in: [src/client/types.gen.ts:554](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L554)

Content is the content array for message types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:558](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L558)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:562](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L562)

Name is the function name for function_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:566](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L566)

Role is the role for message types (e.g., "assistant")

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:570](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L570)

Status is the status of this output item (e.g., "completed")

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:574](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L574)

Type is the output item type (e.g., "message", "function_call")
