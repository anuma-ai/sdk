# DecaySweepResult

Defined in: [src/lib/memory/decayWorker.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#41)

Counts from one sweep, for UI surfacing (e.g. "N memories archived").

## Properties

### archived

> **archived**: `number`

Defined in: [src/lib/memory/decayWorker.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#43)

Rows transitioned active → archived this sweep.

***

### deleted

> **deleted**: `number`

Defined in: [src/lib/memory/decayWorker.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#45)

Rows hard-deleted (archived past the window) this sweep.

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/decayWorker.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#47)

Total candidate rows scanned (all non-hard-deleted rows).
