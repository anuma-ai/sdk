# buildNotionAuthUrl

> **buildNotionAuthUrl**(`params`: [`NotionAuthUrlParams`](../interfaces/NotionAuthUrlParams.md)): `string`

Defined in: [src/lib/auth/notion-primitives.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/notion-primitives.ts#277)

Build the Notion authorization URL for the OAuth flow.

Returns a URL string that the caller should open in a browser
(e.g. via `expo-auth-session` or `Linking.openURL`).

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

`params`

</td>
<td>

[`NotionAuthUrlParams`](../interfaces/NotionAuthUrlParams.md)

</td>
</tr>
</tbody>
</table>

## Returns

`string`
