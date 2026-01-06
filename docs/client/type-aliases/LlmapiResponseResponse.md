# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:762](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L762)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:766](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L766)

Created is the Unix timestamp of creation (created_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:767](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L767)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:771](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L771)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [src/client/types.gen.ts:778](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L778)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:782](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L782)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:786](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L786)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)[]

Defined in: [src/client/types.gen.ts:790](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L790)

Output is the array of output items (OpenAI Responses API format)

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:791](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L791)
