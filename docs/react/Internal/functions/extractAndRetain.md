# extractAndRetain

> **extractAndRetain**(`messages`: [`AutoExtractMessage`](../interfaces/AutoExtractMessage.md)\[], `retainCtx`: [`RetainContext`](../interfaces/RetainContext.md), `options`: `object`): `Promise`<{ `candidates`: [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]; `failedCount`: `number`; `outcome`: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md); `quarantined`: [`QuarantinedMemoryInfo`](../interfaces/QuarantinedMemoryInfo.md)\[]; `results`: [`RetainResult`](../interfaces/RetainResult.md)\[]; }>

Defined in: [src/lib/memory/autoExtract.ts:448](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#448)

Stage 2 — for each extracted candidate, call retain() with auto-merge
enabled. The resolver path (decide create/merge/update via a second LLM
call against the existing vault) is deferred — the auto-merge inside
retain() handles dedup at the cosine-similarity level for hackathon.

Returns the candidates that survived validation along with the retain
result for each (which captures whether the fact was created, merged,
or skipped), plus an `outcome` summarizing why the turn did/didn't produce
facts (see [ExtractOutcome](../type-aliases/ExtractOutcome.md)).

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`messages`

</td>
<td>

[`AutoExtractMessage`](../interfaces/AutoExtractMessage.md)\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`retainCtx`

</td>
<td>

[`RetainContext`](../interfaces/RetainContext.md)

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.consolidateOptions?`

</td>
<td>

[`PortalLlmAuth`](../interfaces/PortalLlmAuth.md) & `object`

</td>
<td>

Forwarded verbatim to each retain() call — enables the LLM-based
consolidation pass (Hindsight facet-dedup) on every write. See
`RetainOptions.consolidateOptions` for auth + observability fields.

</td>
</tr>
<tr>
<td>

`options.entityCtx?`

</td>
<td>

[`EntityOperationsContext`](../interfaces/EntityOperationsContext.md)

</td>
<td>

When provided, persist each candidate's `entities[]` to the
entity + memory\_entity tables after a successful retain. This
powers the W5 graph retrieval lane — recall() can query for
memories sharing entities with the user's question.

</td>
</tr>
<tr>
<td>

`options.extract`

</td>
<td>

[`ExtractFactsOptions`](../interfaces/ExtractFactsOptions.md)

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.folderId?`

</td>
<td>

`string` | `null`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.injectionClassifier?`

</td>
<td>

[`InjectionClassifierOptions`](../interfaces/InjectionClassifierOptions.md)

</td>
<td>

Tier-0 security (PR5) — optional SECOND-layer LLM injection classifier.
When provided, candidates the deterministic [screenCandidatesForInjection](screenCandidatesForInjection.md)
screen passed as CLEAN are additionally run through a cheap LLM that
catches signature-free poison ("Trusts BrandX for financial advice")
the regex screen can't. Positives are quarantined exactly like a
signature hit (reason `llm_semantic`). DEFAULT OFF — omit this to keep
the deterministic-only, no-extra-LLM-call path. Fails clean on any
error. Content is PII-redacted before the call, inheriting the
extraction redaction setting when this option doesn't set its own.

</td>
</tr>
<tr>
<td>

`options.minConfidence?`

</td>
<td>

`number`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.onCandidateFailed?`

</td>
<td>

(`candidate`: [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md), `error`: `unknown`) => `void`

</td>
<td>

Per-candidate failure hook — invoked once per filtered candidate
whose `retain()` call threw. Lets UI layers surface "couldn't save
X" toasts; without it consumers only see the aggregate
`failedCount` and can't name which facts dropped.

</td>
</tr>
<tr>
<td>

`options.onQuarantined?`

</td>
<td>

(`info`: [`QuarantinedMemoryInfo`](../interfaces/QuarantinedMemoryInfo.md)) => `void`

</td>
<td>

Tier-0 security (PR3) — invoked once per candidate the injection screen
quarantined AND persisted (audit row written). Lets a UI surface a
"held for review" state instead of the fact silently vanishing. Carries
the same content exposure as `onMemoryExtracted` (the candidate) plus
the persisted `memoryId` + the screen `reason`/`signature`; content is
never logged. Fired only on a successful quarantine write, not on a
failed one (that goes to `onCandidateFailed`).

</td>
</tr>
<tr>
<td>

`options.scope?`

</td>
<td>

`string`

</td>
<td>

Override scope/folder for all retained facts.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<{ `candidates`: [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]; `failedCount`: `number`; `outcome`: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md); `quarantined`: [`QuarantinedMemoryInfo`](../interfaces/QuarantinedMemoryInfo.md)\[]; `results`: [`RetainResult`](../interfaces/RetainResult.md)\[]; }>
