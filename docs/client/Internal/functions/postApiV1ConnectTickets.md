# postApiV1ConnectTickets

> **postApiV1ConnectTickets**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectTicketsData`](../type-aliases/PostApiV1ConnectTicketsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ConnectTicketsResponses`](../type-aliases/PostApiV1ConnectTicketsResponses.md), [`PostApiV1ConnectTicketsErrors`](../type-aliases/PostApiV1ConnectTicketsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:852](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#852)

Mint a connect-flow ticket

Issues a single-use, 10-minute ticket that fronts the upstream OAuth redirect for a connector vault provider. The browser uses the returned ticket\_id as the entry point to /connectors/{provider}/connect.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ThrowOnError` *extends* `boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

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

`options`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectTicketsData`](../type-aliases/PostApiV1ConnectTicketsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ConnectTicketsResponses`](../type-aliases/PostApiV1ConnectTicketsResponses.md), [`PostApiV1ConnectTicketsErrors`](../type-aliases/PostApiV1ConnectTicketsErrors.md), `ThrowOnError`>
