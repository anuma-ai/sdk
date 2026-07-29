# seedEncryptionKeys

> **seedEncryptionKeys**(`address`: `string`, `keys`: `object`): `void`

Defined in: [src/react/useEncryption.ts:794](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#794)

Seed (or merge) raw key hex into the in-memory store without signing.

Used by platform polyfills that hydrate from SecureStore / keychain where
one version may be missing — callers must not require both versions to
exist before the other becomes usable (#561).

Existing versions are preserved when the corresponding argument is omitted.
Pass an explicit empty merge is not supported; omit the field to leave it.

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

`address`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`keys`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`keys.current?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`keys.legacy?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`void`
