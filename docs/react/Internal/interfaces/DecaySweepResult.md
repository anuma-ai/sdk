# DecaySweepResult

Defined in: [src/lib/memory/decayWorker.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#20)

Counts from one sweep, for UI surfacing (e.g. "N memories archived").

## Properties

### archived

> **archived**: `number`

Defined in: [src/lib/memory/decayWorker.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#26)

Rows transitioned active → archived this sweep.

***

### classifierCalls

> **classifierCalls**: `number`

Defined in: [src/lib/memory/decayWorker.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#23)

***

### classifierCapHits

> **classifierCapHits**: `number`

Defined in: [src/lib/memory/decayWorker.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#24)

***

### classifierDriven

> **classifierDriven**: `object`

Defined in: [src/lib/memory/decayWorker.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#22)

**archived**

> **archived**: `number`

**deleted**

> **deleted**: `number`

***

### deleted

> **deleted**: `number`

Defined in: [src/lib/memory/decayWorker.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#28)

Rows hard-deleted (archived past the window) this sweep.

***

### ruleDriven

> **ruleDriven**: `object`

Defined in: [src/lib/memory/decayWorker.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#21)

**archived**

> **archived**: `number`

**deleted**

> **deleted**: `number`

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/decayWorker.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#30)

Total candidate rows scanned (all non-hard-deleted rows).
