# LlmapiSearchRequest

> **LlmapiSearchRequest** = `object`

Defined in: [src/client/types.gen.ts:524](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L524)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [src/client/types.gen.ts:528](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L528)

Country code filter (e.g., "US", "GB", "DE").

***

### max\_results?

> `optional` **max\_results**: `number`

Defined in: [src/client/types.gen.ts:532](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L532)

Maximum number of results to return (1-20). Default: 10.

***

### max\_tokens\_per\_page?

> `optional` **max\_tokens\_per\_page**: `number`

Defined in: [src/client/types.gen.ts:536](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L536)

Maximum tokens per page to process. Default: 1024.

***

### query

> **query**: `string`[]

Defined in: [src/client/types.gen.ts:540](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L540)

Search query. Can be a single string or array of strings.

***

### search\_domain\_filter?

> `optional` **search\_domain\_filter**: `string`[]

Defined in: [src/client/types.gen.ts:544](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L544)

List of domains to filter results (max 20 domains).

***

### search\_tool\_name

> **search\_tool\_name**: `string`

Defined in: [src/client/types.gen.ts:548](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L548)

The search provider to use.
