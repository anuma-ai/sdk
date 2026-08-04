# DecayClassifier

Defined in: [src/lib/memory/decayWorker.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#74)

PR5 seam — an on-device classifier that refines the rule-based verdict for
borderline rows (e.g. type `other`/null, or a `plan` without an event end).
Because it may read decrypted content, callers MUST gate providing it on
wallet-key availability. Left undefined here → pure rule-based sweep.

Egress is bounded by the sweeper (NOT the classifier): each sweep caps how
many rows reach the classifier ([CreateDecaySweeperOptions.maxClassifierCallsPerSweep](CreateDecaySweeperOptions.md#maxclassifiercallspersweep))
and a row whose (id, updated\_at) was already classified is never re-sent on a
later sweep — so a stable borderline "keep" row egresses at most once.

SECURITY (MEDIUM, residual) — enabling a classifier hands whoever answers the
portal (incl. a malicious / MITM'd endpoint) a lever over the affected rows:
a hostile verdict can only quarantine-adjacent OUTCOMES here, i.e. archive a
row (reversible — never a hard delete, which stays the deterministic
archived-past-window mechanic). Bounded, reversible trust tradeoff; gate the
classifier on trust in the portal.

## Param

The same plaintext inputs the rule engine saw.

## Param

The rule-based verdict, as a starting point / fallback.

## Param

The sweep's reference time (Unix ms). Injected so the
classifier derives any age math from the same clock the rule engine used,
never wall-clock `Date.now()` — keeping a fixed-`now` sweep deterministic.

## Methods

### classify()

> **classify**(`input`: [`DecayInput`](DecayInput.md), `ruleVerdict`: [`DecayVerdict`](../type-aliases/DecayVerdict.md), `now`: `number`): [`DecayVerdict`](../type-aliases/DecayVerdict.md) | `Promise`<[`DecayVerdict`](../type-aliases/DecayVerdict.md)>

Defined in: [src/lib/memory/decayWorker.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#75)

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

`input`

</td>
<td>

[`DecayInput`](DecayInput.md)

</td>
</tr>
<tr>
<td>

`ruleVerdict`

</td>
<td>

[`DecayVerdict`](../type-aliases/DecayVerdict.md)

</td>
</tr>
<tr>
<td>

`now`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

[`DecayVerdict`](../type-aliases/DecayVerdict.md) | `Promise`<[`DecayVerdict`](../type-aliases/DecayVerdict.md)>
