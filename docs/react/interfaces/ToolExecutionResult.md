---
title: ToolExecutionResult
---

[SDK Documentation](../../README.md) / [react](../README.md) / ToolExecutionResult

# Interface: ToolExecutionResult

Defined in: [lib/tools/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L51)

Result of executing a client-side tool

## Properties

### error?

> `optional` **error**: `string`

Defined in: [lib/tools/types.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L59)

Error message if execution failed

***

### result?

> `optional` **result**: `unknown`

Defined in: [lib/tools/types.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L57)

The result returned by the tool

***

### success

> **success**: `boolean`

Defined in: [lib/tools/types.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L55)

Whether execution was successful

***

### toolName

> **toolName**: `string`

Defined in: [lib/tools/types.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L53)

Name of the tool that was executed
