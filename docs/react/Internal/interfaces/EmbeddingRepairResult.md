# EmbeddingRepairResult

Defined in: [src/lib/memory/store/types.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#249)

## Properties

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/types.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#257)

Where the next run resumes; absent when the next run starts over from the newest memory.

***

### deferred?

> `optional` **deferred**: `boolean`

Defined in: [src/lib/memory/store/types.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#251)

Another device owns the work; preserve the cursor and retry later.

***

### failed

> **failed**: `number`

Defined in: [src/lib/memory/store/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#254)

***

### reembedded

> **reembedded**: `number`

Defined in: [src/lib/memory/store/types.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#253)

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/store/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#252)

***

### skippedConflict

> **skippedConflict**: `number`

Defined in: [src/lib/memory/store/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#255)
