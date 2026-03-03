# isR2UrlExpired

> **isR2UrlExpired**(`sourceUrl`: `string`, `createdAt?`: `string` | `number` | `Date`): `boolean`

Defined in: [src/lib/storage/r2Expiry.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/r2Expiry.ts#35)

Returns `true` if the given R2 presigned URL is expired.

**Primary**: Parses `X-Amz-Date` + `X-Amz-Expires` query params to compute
the exact expiry timestamp.

**Fallback**: If URL parsing fails, checks `createdAt + R2_DEFAULT_TTL_MS`.

If neither method can determine expiry, returns `false` (assume valid).

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

`sourceUrl`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`createdAt?`

</td>
<td>

`string` | `number` | `Date`

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
