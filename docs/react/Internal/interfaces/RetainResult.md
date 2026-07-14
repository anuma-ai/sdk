# RetainResult

Defined in: [src/lib/memory/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#303)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#304)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#305)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#309)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:307](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#307)

When action is 'merge' or 'update', the prior memory's id.
