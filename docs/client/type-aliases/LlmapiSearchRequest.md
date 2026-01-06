# LlmapiSearchRequest

> **LlmapiSearchRequest** = \{ `country?`: `string`; `max_results?`: `number`; `max_tokens_per_page?`: `number`; `query`: `string`[]; `search_domain_filter?`: `string`[]; `search_tool_name`: `string`; \}

Defined in: [src/client/types.gen.ts:835](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L835)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [src/client/types.gen.ts:839](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L839)

Country code filter (e.g., "US", "GB", "DE").

***

### max\_results?

> `optional` **max\_results**: `number`

Defined in: [src/client/types.gen.ts:843](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L843)

Maximum number of results to return (1-20). Default: 10.

***

### max\_tokens\_per\_page?

> `optional` **max\_tokens\_per\_page**: `number`

Defined in: [src/client/types.gen.ts:847](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L847)

Maximum tokens per page to process. Default: 1024.

***

### query

> **query**: `string`[]

Defined in: [src/client/types.gen.ts:851](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L851)

Search query. Can be a single string or array of strings.

***

### search\_domain\_filter?

> `optional` **search\_domain\_filter**: `string`[]

Defined in: [src/client/types.gen.ts:855](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L855)

List of domains to filter results (max 20 domains).

***

### search\_tool\_name

> **search\_tool\_name**: `string`

Defined in: [src/client/types.gen.ts:859](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L859)

The search provider to use.
