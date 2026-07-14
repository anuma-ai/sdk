# DEFAULT\_MAX\_CLASSIFIER\_CALLS\_PER\_SWEEP

> `const` **DEFAULT\_MAX\_CLASSIFIER\_CALLS\_PER\_SWEEP**: `20` = `20`

Defined in: [src/lib/memory/decayWorker.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#133)

Default per-sweep ceiling on decay-classifier invocations (see
[CreateDecaySweeperOptions.maxClassifierCallsPerSweep](../interfaces/CreateDecaySweeperOptions.md#maxclassifiercallspersweep)). Kept small: the
classifier egresses DECRYPTED content, so a sweep must never fan out to
hundreds of sequential calls. 20 covers the borderline churn of a typical
sweep while capping worst-case egress; stable rows are also cached so this
ceiling is rarely reached after the first sweep.
