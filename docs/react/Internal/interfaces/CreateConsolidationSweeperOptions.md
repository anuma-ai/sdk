# CreateConsolidationSweeperOptions

Defined in: [src/lib/memory/types.ts:482](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#482)

## Properties

### consolidateOptions?

> `optional` **consolidateOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:504](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#504)

LLM decide-model auth/endpoint. REQUIRED for the dedup step — it egresses
DECRYPTED cluster content to the portal decide model (same trust posture as
the decay classifier). When ABSENT, the sweep still runs embedding backfill

* junk purge but SKIPS dedup entirely (no plaintext leaves the device).

**Type Declaration**

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

**onFallback()?**

> `optional` **onFallback**: (`reason`: [`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)) => `void`

Notified when the consolidator degrades to its create fallback.

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

`reason`

</td>
<td>

[`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**piiRedaction?**

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

PII-redact cluster content before it reaches the decide model, and
de-anonymize the result before it is persisted. Pass `true` or a shared
redactor.

***

### consolidateThreshold?

> `optional` **consolidateThreshold**: `number`

Defined in: [src/lib/memory/types.ts:517](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#517)

Cosine floor to cluster near-duplicates. Default 0.55 — matches retain's
`DEFAULT_CONSOLIDATE_THRESHOLD` (deliberately conservative: too low a floor
risks clustering distinct same-subject facts and retiring a correct one).

***

### dryRun?

> `optional` **dryRun**: `boolean`

Defined in: [src/lib/memory/types.ts:532](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#532)

When true, compute + log/return what WOULD be superseded / junk-deleted /
backfilled but apply NOTHING. **Default true** (safe): the sweep also drives
destructive soft-deletes + supersedes, so a caller must explicitly opt in
with `dryRun: false` to APPLY. Ship the first rollout log-only, then flip.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:488](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#488)

Embedding API options — used to backfill un-embedded rows and to re-embed a
merged survivor so its vector stays consistent with its new content.

***

### maxBackfillPerSweep?

> `optional` **maxBackfillPerSweep**: `number`

Defined in: [src/lib/memory/types.ts:520](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#520)

Max un-embedded rows to backfill per sweep. Default 50. Bounded so a large
vault drains its backlog across sweeps rather than in one spike.

***

### maxClustersPerSweep?

> `optional` **maxClustersPerSweep**: `number`

Defined in: [src/lib/memory/types.ts:527](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#527)

Max multi-row clusters to consolidate (i.e. portal calls) per sweep.
Default 20. Excess clusters are deferred and counted in
[ConsolidationSweepResult.clustersDropped](ConsolidationSweepResult.md#clustersdropped).

***

### maxJunkChecksPerSweep?

> `optional` **maxJunkChecksPerSweep**: `number`

Defined in: [src/lib/memory/types.ts:523](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#523)

Max rows to decrypt + junk-check per sweep (a stable clean row is not
re-checked until its `updated_at` changes). Default 50.

***

### now?

> `optional` **now**: `number` | () => `number`

Defined in: [src/lib/memory/types.ts:497](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#497)

Reference "now". A number is fixed (deterministic tests); a function is
re-evaluated per sweep. Default `Date.now`. (Reserved for future
time-based heuristics; the sweep is otherwise time-independent.)

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/lib/memory/types.ts:536](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#536)

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

> `optional` **onSwept**: (`result`: [`ConsolidationSweepResult`](ConsolidationSweepResult.md)) => `void`

Defined in: [src/lib/memory/types.ts:534](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#534)

Fires once after each sweep with the counts (UI / telemetry).

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

[`ConsolidationSweepResult`](ConsolidationSweepResult.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### vaultCache

> **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:491](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#491)

Vault embedding LRU cache shared with recall/retain — kept in sync on
backfill / survivor re-embed.

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:485](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#485)

Vault write context — the same one recall/retain use. Must be scoped
(userId) or explicitly `singleTenant` (per-wallet client DB).
