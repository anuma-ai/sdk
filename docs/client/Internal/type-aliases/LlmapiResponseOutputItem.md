# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:938](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L938)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:942](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L942)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:946](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L946)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:950](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L950)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:954](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L954)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:958](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L958)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:962](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L962)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:966](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L966)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:970](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L970)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:974](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L974)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:978](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L978)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:982](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L982)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:986](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L986)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:990](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L990)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
