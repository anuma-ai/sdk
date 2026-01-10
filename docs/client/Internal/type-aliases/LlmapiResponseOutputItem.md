# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: src/client/types.gen.ts:671

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: src/client/types.gen.ts:675

Arguments is the function arguments for function\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: src/client/types.gen.ts:679

CallID is the call ID for function\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: src/client/types.gen.ts:683

Content is the content array for message and reasoning types

***

### id?

> `optional` **id**: `string`

Defined in: src/client/types.gen.ts:687

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: src/client/types.gen.ts:691

Name is the function name for function\_call types

***

### role?

> `optional` **role**: `string`

Defined in: src/client/types.gen.ts:695

Role is the role for message types (e.g., "assistant")

***

### status?

> `optional` **status**: `string`

Defined in: src/client/types.gen.ts:699

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: src/client/types.gen.ts:703

Summary is the reasoning summary for reasoning types

***

### type?

> `optional` **type**: `string`

Defined in: src/client/types.gen.ts:707

Type is the output item type (e.g., "message", "function\_call", "reasoning")
