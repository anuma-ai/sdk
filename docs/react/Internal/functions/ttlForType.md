# ttlForType

> **ttlForType**(`factType`: `string` | `null`, `policy?`: `Partial`<[`DecayPolicy`](../interfaces/DecayPolicy.md)>): `number`

Defined in: [src/lib/memory/decay.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#120)

The age TTL for a fact type. `null` / unknown types fall to the medium
fallback bucket (never Infinity — untyped rows must still eventually age out).

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

`factType`

</td>
<td>

`string` | `null`

</td>
</tr>
<tr>
<td>

`policy?`

</td>
<td>

`Partial`<[`DecayPolicy`](../interfaces/DecayPolicy.md)>

</td>
</tr>
</tbody>
</table>

## Returns

`number`
