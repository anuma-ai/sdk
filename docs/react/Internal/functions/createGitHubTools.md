# createGitHubTools

> **createGitHubTools**(`getAccessToken`: () => `string` | `null`, `requestGitHubAccess`: () => `Promise`<`string`>): `ToolConfig`\[]

Defined in: [src/tools/github.ts:1125](https://github.com/anuma-ai/sdk/blob/main/src/tools/github.ts#1125)

Create all GitHub tools for the chat system.

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

`getAccessToken`

</td>
<td>

() => `string` | `null`

</td>
<td>

Returns the current GitHub access token (or null)

</td>
</tr>
<tr>
<td>

`requestGitHubAccess`

</td>
<td>

() => `Promise`<`string`>

</td>
<td>

Triggers the OAuth flow and returns a token

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`\[]
