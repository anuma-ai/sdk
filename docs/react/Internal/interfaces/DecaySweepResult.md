# DecaySweepResult

Defined in: [src/lib/memory/decayWorker.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#42)

Counts from one sweep, for UI surfacing (e.g. "N memories archived").

## Properties

### archived

> **archived**: `number`

Defined in: [src/lib/memory/decayWorker.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#44)

Rows transitioned active → archived this sweep.

***

### deleted

> **deleted**: `number`

Defined in: [src/lib/memory/decayWorker.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#46)

Rows hard-deleted (archived past the window) this sweep.

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/decayWorker.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#48)

Total candidate rows scanned (all non-hard-deleted rows).
