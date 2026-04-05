# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1907](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1907)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1911](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1911)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1915](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1915)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1919](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1919)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1923](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1923)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1927](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1927)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1931](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1931)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1935)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1939](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1939)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1943](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1943)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1947](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1947)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1951](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1951)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1955](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1955)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1959)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
