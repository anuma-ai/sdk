# CreateDecaySweeperOptions

Defined in: [src/lib/memory/decayWorker.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#86)

## Properties

### classifier?

> `optional` **classifier**: [`DecayClassifier`](DecayClassifier.md)

Defined in: [src/lib/memory/decayWorker.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#101)

PR5 seam. When provided, borderline candidates' rule verdict is passed
through it. Gate on key availability (it may decrypt content). Default
undefined. Egress is bounded — see [maxClassifierCallsPerSweep](#maxclassifiercallspersweep).

***

### maxClassifierCallsPerSweep?

> `optional` **maxClassifierCallsPerSweep**: `number`

Defined in: [src/lib/memory/decayWorker.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#110)

PR5 — hard ceiling on classifier invocations (and thus decrypted-content
portal egress) per sweep. Once hit, the remaining borderline rows fall back
to the rule verdict for that sweep (no call). Prevents a large vault from
firing hundreds of sequential content-bearing calls in one sweep. Default
[DEFAULT\_MAX\_CLASSIFIER\_CALLS\_PER\_SWEEP](../variables/DEFAULT_MAX_CLASSIFIER_CALLS_PER_SWEEP.md) (20). Cache hits (a row
already classified at its current `updated_at`) do NOT count against this.

***

### now?

> `optional` **now**: [`NowSource`](../type-aliases/NowSource.md)

Defined in: [src/lib/memory/decayWorker.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#93)

Reference "now". A number is fixed (deterministic tests); a function is
re-evaluated per sweep (long-lived interval usage). Default `Date.now`.

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/lib/memory/decayWorker.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#114)

Diagnostic — fires on an unexpected sweep-level error.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onSwept()?

> `optional` **onSwept**: (`result`: [`DecaySweepResult`](DecaySweepResult.md)) => `void`

Defined in: [src/lib/memory/decayWorker.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#112)

Fires once after each sweep with the transition counts (UI).

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`result`

</td>
<td>

[`DecaySweepResult`](DecaySweepResult.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### policy?

> `optional` **policy**: `Partial`<[`DecayPolicy`](DecayPolicy.md)>

Defined in: [src/lib/memory/decayWorker.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#95)

Partial policy overriding the per-type TTL defaults. Omit for defaults.

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/decayWorker.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#88)

Vault write context — the same one recall/retain use.
