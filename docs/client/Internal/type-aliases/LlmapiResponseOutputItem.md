# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:807](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L807)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:811](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L811)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:815](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L815)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:819](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L819)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:823](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L823)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:827](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L827)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:831](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L831)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:835](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L835)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:839](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L839)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:843](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L843)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:847](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L847)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:851](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L851)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:855](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L855)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:859](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L859)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
