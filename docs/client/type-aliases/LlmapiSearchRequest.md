# LlmapiSearchRequest

> **LlmapiSearchRequest** = `object`

Defined in: [src/client/types.gen.ts:797](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L797)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [src/client/types.gen.ts:801](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L801)

Country code filter (e.g., "US", "GB", "DE").

***

### max\_results?

> `optional` **max\_results**: `number`

Defined in: [src/client/types.gen.ts:805](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L805)

Maximum number of results to return (1-20). Default: 10.

***

### max\_tokens\_per\_page?

> `optional` **max\_tokens\_per\_page**: `number`

Defined in: [src/client/types.gen.ts:809](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L809)

Maximum tokens per page to process. Default: 1024.

***

### query

> **query**: `string`[]

Defined in: [src/client/types.gen.ts:813](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L813)

Search query. Can be a single string or array of strings.

***

### search\_domain\_filter?

> `optional` **search\_domain\_filter**: `string`[]

Defined in: [src/client/types.gen.ts:817](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L817)

List of domains to filter results (max 20 domains).

***

### search\_tool\_name

> **search\_tool\_name**: `string`

Defined in: [src/client/types.gen.ts:821](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L821)

The search provider to use.
