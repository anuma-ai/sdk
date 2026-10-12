# DecaySweepResult

Defined in: [src/lib/memory/decayWorker.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#21)

Counts from one sweep, for UI surfacing (e.g. "N memories archived").

## Properties

### archived

> **archived**: `number`

Defined in: [src/lib/memory/decayWorker.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#23)

Rows transitioned active → archived this sweep.

***

### deleted

> **deleted**: `number`

Defined in: [src/lib/memory/decayWorker.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#25)

Rows hard-deleted (archived past the window) this sweep.

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/decayWorker.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#27)

Total candidate rows scanned (all non-hard-deleted rows).
