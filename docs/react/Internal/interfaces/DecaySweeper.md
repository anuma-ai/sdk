# DecaySweeper

Defined in: [src/lib/memory/decayWorker.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#118)

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [src/lib/memory/decayWorker.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#127)

Stop accepting sweeps. An in-flight `runSweep()` resolves normally.

**Returns**

`void`

***

### runSweep()

> **runSweep**(): `Promise`<[`DecaySweepResult`](DecaySweepResult.md)>

Defined in: [src/lib/memory/decayWorker.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#125)

Scan the vault, classify every candidate, and apply archive/delete
transitions. Safe to call repeatedly (idempotent — a keep stays a keep, an
already-archived row won't re-archive). Returns the transition counts.
A no-op (returns zero counts) after [DecaySweeper.dispose](#dispose).

**Returns**

`Promise`<[`DecaySweepResult`](DecaySweepResult.md)>
