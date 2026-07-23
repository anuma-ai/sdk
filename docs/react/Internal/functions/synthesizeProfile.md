# synthesizeProfile

> **synthesizeProfile**(`ctx`: [`RecallContext`](../interfaces/RecallContext.md), `options`: [`SynthesizeProfileOptions`](../interfaces/SynthesizeProfileOptions.md)): `Promise`<[`ProfileDoc`](../interfaces/ProfileDoc.md)>

Defined in: [src/lib/memory/synthesizeProfile.ts:265](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#265)

Synthesize a shareable [ProfileDoc](../interfaces/ProfileDoc.md) from the user's vault, on-device.

Stateless: pass `options.previous` to reuse unchanged sections (delta refresh)
and the caller persists the result. On per-facet LLM failure the section
falls back to its prior value (marked `stale`) or an empty section.

## Parameters

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

`ctx`

</td>
<td>

[`RecallContext`](../interfaces/RecallContext.md)

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`SynthesizeProfileOptions`](../interfaces/SynthesizeProfileOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ProfileDoc`](../interfaces/ProfileDoc.md)>
