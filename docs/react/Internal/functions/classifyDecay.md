# classifyDecay

> **classifyDecay**(`m`: [`DecayInput`](../interfaces/DecayInput.md), `now`: `number`, `policy?`: `Partial`<[`DecayPolicy`](../interfaces/DecayPolicy.md)>): [`DecayVerdict`](../type-aliases/DecayVerdict.md)

Defined in: [src/lib/memory/decay.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#144)

Classify one memory into a decay verdict, reading only plaintext fields.

Rules, in order (first match wins):

1. `source === "manual"` → keep (user-curated; never decayed).
2. Already archived (`archivedAt != null`): delete once past the hard-delete
   window, else keep (still recoverable).
3. `plan` / `ongoing_context` whose event has become past — `eventTimeEnd`
   is set AND older than `now - grace` → archive. An `ongoing` status with a
   null `eventTimeEnd` is still ongoing, so this rule does not fire for it.
4. Age fallback — `now - updatedAt > TTL(factType)` → archive. Durable types
   have Infinity TTL, so this never fires for them; null/unknown use medium.
5. Otherwise → keep.

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

`m`

</td>
<td>

[`DecayInput`](../interfaces/DecayInput.md)

</td>
<td>

Plaintext decay inputs for one row.

</td>
</tr>
<tr>
<td>

`now`

</td>
<td>

`number`

</td>
<td>

Reference time (Unix ms). Injected for determinism.

</td>
</tr>
<tr>
<td>

`policy?`

</td>
<td>

`Partial`<[`DecayPolicy`](../interfaces/DecayPolicy.md)>

</td>
<td>

Optional partial policy overriding [DEFAULT\_DECAY\_POLICY](../variables/DEFAULT_DECAY_POLICY.md).

</td>
</tr>
</tbody>
</table>

## Returns

[`DecayVerdict`](../type-aliases/DecayVerdict.md)
