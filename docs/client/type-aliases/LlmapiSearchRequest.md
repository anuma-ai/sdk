# LlmapiSearchRequest

> **LlmapiSearchRequest** = `object`

Defined in: [src/client/types.gen.ts:690](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L690)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [src/client/types.gen.ts:694](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L694)

Country code filter (e.g., "US", "GB", "DE").

***

### max\_results?

> `optional` **max\_results**: `number`

Defined in: [src/client/types.gen.ts:698](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L698)

Maximum number of results to return (1-20). Default: 10.

***

### max\_tokens\_per\_page?

> `optional` **max\_tokens\_per\_page**: `number`

Defined in: [src/client/types.gen.ts:702](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L702)

Maximum tokens per page to process. Default: 1024.

***

### query

> **query**: `string`[]

Defined in: [src/client/types.gen.ts:706](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L706)

Search query. Can be a single string or array of strings.

***

### search\_domain\_filter?

> `optional` **search\_domain\_filter**: `string`[]

Defined in: [src/client/types.gen.ts:710](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L710)

List of domains to filter results (max 20 domains).

***

### search\_tool\_name

> **search\_tool\_name**: `string`

Defined in: [src/client/types.gen.ts:714](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L714)

The search provider to use.
