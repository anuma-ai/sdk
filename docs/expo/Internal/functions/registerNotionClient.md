# registerNotionClient

> **registerNotionClient**(`registrationEndpoint`: `string`, `redirectUri`: `string`, `clientName`: `string`): `Promise`<[`NotionClientRegistration`](../interfaces/NotionClientRegistration.md)>

Defined in: [src/lib/auth/notion-primitives.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/notion-primitives.ts#212)

Register a new OAuth client dynamically.

Registers as a **public client** (`token_endpoint_auth_method: "none"`)
so no client secret is needed for token exchange (PKCE is used instead).

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`registrationEndpoint`

</td>
<td>

`string`

</td>
<td>

`undefined`

</td>
<td>

The RFC 7591 registration endpoint URL.

</td>
</tr>
<tr>
<td>

`redirectUri`

</td>
<td>

`string`

</td>
<td>

`undefined`

</td>
<td>

Redirect URI to register for this client.

</td>
</tr>
<tr>
<td>

`clientName`

</td>
<td>

`string`

</td>
<td>

`"Anuma"`

</td>
<td>

Human-readable name shown in Notion's consent screen.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`NotionClientRegistration`](../interfaces/NotionClientRegistration.md)>
