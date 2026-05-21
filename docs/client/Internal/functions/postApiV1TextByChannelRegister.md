# postApiV1TextByChannelRegister

> **postApiV1TextByChannelRegister**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1TextByChannelRegisterData`](../type-aliases/PostApiV1TextByChannelRegisterData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1TextByChannelRegisterResponses`](../type-aliases/PostApiV1TextByChannelRegisterResponses.md), [`PostApiV1TextByChannelRegisterErrors`](../type-aliases/PostApiV1TextByChannelRegisterErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1043](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1043)

Register identifier for text channel

Registers an identifier (phone, email, etc.) for text channel interaction. The identifier must be linked in the user's Privy account (for SMS). Idempotent for the same account+channel (updates preferred model).

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1TextByChannelRegisterData`](../type-aliases/PostApiV1TextByChannelRegisterData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1TextByChannelRegisterResponses`](../type-aliases/PostApiV1TextByChannelRegisterResponses.md), [`PostApiV1TextByChannelRegisterErrors`](../type-aliases/PostApiV1TextByChannelRegisterErrors.md), `ThrowOnError`>
