# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:663](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L663)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:667](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L667)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:668](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L668)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:672](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L672)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:679](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L679)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:683](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L683)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:687](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L687)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:691](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L691)

Output is the array of output items (OpenAI Responses API format)

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:692](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L692)
