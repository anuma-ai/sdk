# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:686](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L686)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:690](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L690)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:694](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L694)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:698](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L698)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:702](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L702)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:706](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L706)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:710](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L710)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:714](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L714)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:718](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L718)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:722](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L722)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:726](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L726)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:730](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L730)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:734](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L734)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:738](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L738)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
