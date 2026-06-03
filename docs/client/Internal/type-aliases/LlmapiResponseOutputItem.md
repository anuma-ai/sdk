# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:758](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#758)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#762)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#766)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#770)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:774](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#774)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#778)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:782](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#782)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:786](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#786)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:790](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#790)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:794](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#794)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:798](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#798)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:802](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#802)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:806](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#806)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#810)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
