# RetainResult

Defined in: [src/lib/memory/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#304)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#305)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#306)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:310](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#310)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:308](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#308)

When action is 'merge' or 'update', the prior memory's id.
