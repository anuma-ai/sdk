# DecaySweepResult

Defined in: [src/lib/memory/decayWorker.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#32)

Counts from one sweep, for UI surfacing (e.g. "N memories archived").

## Properties

### archived

> **archived**: `number`

Defined in: [src/lib/memory/decayWorker.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#34)

Rows transitioned active → archived this sweep.

***

### deleted

> **deleted**: `number`

Defined in: [src/lib/memory/decayWorker.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#36)

Rows hard-deleted (archived past the window) this sweep.

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/decayWorker.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#38)

Total candidate rows scanned (all non-hard-deleted rows).
