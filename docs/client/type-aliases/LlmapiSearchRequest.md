# LlmapiSearchRequest

> **LlmapiSearchRequest** = `object`

Defined in: [src/client/types.gen.ts:717](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L717)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [src/client/types.gen.ts:721](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L721)

Country code filter (e.g., "US", "GB", "DE").

***

### max\_results?

> `optional` **max\_results**: `number`

Defined in: [src/client/types.gen.ts:725](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L725)

Maximum number of results to return (1-20). Default: 10.

***

### max\_tokens\_per\_page?

> `optional` **max\_tokens\_per\_page**: `number`

Defined in: [src/client/types.gen.ts:729](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L729)

Maximum tokens per page to process. Default: 1024.

***

### query

> **query**: `string`[]

Defined in: [src/client/types.gen.ts:733](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L733)

Search query. Can be a single string or array of strings.

***

### search\_domain\_filter?

> `optional` **search\_domain\_filter**: `string`[]

Defined in: [src/client/types.gen.ts:737](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L737)

List of domains to filter results (max 20 domains).

***

### search\_tool\_name

> **search\_tool\_name**: `string`

Defined in: [src/client/types.gen.ts:741](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L741)

The search provider to use.
