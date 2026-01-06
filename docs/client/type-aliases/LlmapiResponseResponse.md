# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:724](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L724)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:728](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L728)

Created is the Unix timestamp of creation (created_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:729](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L729)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:733](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L733)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [src/client/types.gen.ts:740](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L740)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:744](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L744)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:748](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L748)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)[]

Defined in: [src/client/types.gen.ts:752](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L752)

Output is the array of output items (OpenAI Responses API format)

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:753](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L753)
