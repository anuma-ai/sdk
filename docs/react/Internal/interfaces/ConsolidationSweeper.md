# ConsolidationSweeper

Defined in: [src/lib/memory/types.ts:540](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#540)

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [src/lib/memory/types.ts:550](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#550)

Stop accepting sweeps. An in-flight `sweep()` resolves normally.

**Returns**

`void`

***

### sweep()

> **sweep**(): `Promise`<[`ConsolidationSweepResult`](ConsolidationSweepResult.md)>

Defined in: [src/lib/memory/types.ts:548](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#548)

Scan the vault, backfill missing embeddings, purge junk, and collapse
near-duplicate clusters (retiring stale rows as history). Safe to call
repeatedly — supersede keeps history (reversible) and each op re-checks
inside its write, so a live re-observation racing the sweep wins. Returns
the counts. A no-op (zero counts) after [ConsolidationSweeper.dispose](#dispose).

**Returns**

`Promise`<[`ConsolidationSweepResult`](ConsolidationSweepResult.md)>
