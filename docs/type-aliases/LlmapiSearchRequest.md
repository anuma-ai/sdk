---
title: LlmapiSearchRequest
---

[@reverbia/sdk](../globals.md) / LlmapiSearchRequest

# Type Alias: LlmapiSearchRequest

> **LlmapiSearchRequest** = `object`

Defined in: [types.gen.ts:484](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L484)

## Properties

### country?

> `optional` **country**: `string`

Defined in: [types.gen.ts:488](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L488)

Country code filter (e.g., "US", "GB", "DE").

---

### max_results?

> `optional` **max_results**: `number`

Defined in: [types.gen.ts:492](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L492)

Maximum number of results to return (1-20). Default: 10.

---

### max_tokens_per_page?

> `optional` **max_tokens_per_page**: `number`

Defined in: [types.gen.ts:496](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L496)

Maximum tokens per page to process. Default: 1024.

---

### query?

> `optional` **query**: `string`[]

Defined in: [types.gen.ts:500](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L500)

Search query. Can be a single string or array of strings.

---

### search_domain_filter?

> `optional` **search_domain_filter**: `string`[]

Defined in: [types.gen.ts:504](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L504)

List of domains to filter results (max 20 domains).

---

### search_tool_name?

> `optional` **search_tool_name**: `string`

Defined in: [types.gen.ts:508](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L508)

The search provider to use.
