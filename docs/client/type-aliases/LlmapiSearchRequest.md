# LlmapiSearchRequest

> **LlmapiSearchRequest** = `object`

Defined in: [src/client/types.gen.ts:484](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L484)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [src/client/types.gen.ts:488](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L488)

Country code filter (e.g., "US", "GB", "DE").

***

### max\_results?

> `optional` **max\_results**: `number`

Defined in: [src/client/types.gen.ts:492](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L492)

Maximum number of results to return (1-20). Default: 10.

***

### max\_tokens\_per\_page?

> `optional` **max\_tokens\_per\_page**: `number`

Defined in: [src/client/types.gen.ts:496](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L496)

Maximum tokens per page to process. Default: 1024.

***

### query

> **query**: `string`[]

Defined in: [src/client/types.gen.ts:500](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L500)

Search query. Can be a single string or array of strings.

***

### search\_domain\_filter?

> `optional` **search\_domain\_filter**: `string`[]

Defined in: [src/client/types.gen.ts:504](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L504)

List of domains to filter results (max 20 domains).

***

### search\_tool\_name

> **search\_tool\_name**: `string`

Defined in: [src/client/types.gen.ts:508](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L508)

The search provider to use.
