# LlmapiSearchRequest

> **LlmapiSearchRequest** = \{ `country?`: `string`; `max_results?`: `number`; `max_tokens_per_page?`: `number`; `query`: `string`[]; `search_domain_filter?`: `string`[]; `search_tool_name`: `string`; \}

Defined in: [src/client/types.gen.ts:729](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L729)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [src/client/types.gen.ts:733](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L733)

Country code filter (e.g., "US", "GB", "DE").

***

### max\_results?

> `optional` **max\_results**: `number`

Defined in: [src/client/types.gen.ts:737](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L737)

Maximum number of results to return (1-20). Default: 10.

***

### max\_tokens\_per\_page?

> `optional` **max\_tokens\_per\_page**: `number`

Defined in: [src/client/types.gen.ts:741](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L741)

Maximum tokens per page to process. Default: 1024.

***

### query

> **query**: `string`[]

Defined in: [src/client/types.gen.ts:745](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L745)

Search query. Can be a single string or array of strings.

***

### search\_domain\_filter?

> `optional` **search\_domain\_filter**: `string`[]

Defined in: [src/client/types.gen.ts:749](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L749)

List of domains to filter results (max 20 domains).

***

### search\_tool\_name

> **search\_tool\_name**: `string`

Defined in: [src/client/types.gen.ts:753](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L753)

The search provider to use.
