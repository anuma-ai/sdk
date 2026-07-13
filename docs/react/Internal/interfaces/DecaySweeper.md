# DecaySweeper

Defined in: src/lib/memory/decayWorker.ts:81

## Methods

### dispose()

> **dispose**(): `void`

Defined in: src/lib/memory/decayWorker.ts:90

Stop accepting sweeps. An in-flight `runSweep()` resolves normally.

**Returns**

`void`

***

### runSweep()

> **runSweep**(): `Promise`<[`DecaySweepResult`](DecaySweepResult.md)>

Defined in: src/lib/memory/decayWorker.ts:88

Scan the vault, classify every candidate, and apply archive/delete
transitions. Safe to call repeatedly (idempotent — a keep stays a keep, an
already-archived row won't re-archive). Returns the transition counts.
A no-op (returns zero counts) after [DecaySweeper.dispose](#dispose).

**Returns**

`Promise`<[`DecaySweepResult`](DecaySweepResult.md)>
