# CreateWalletPaymentToolOptions

> **CreateWalletPaymentToolOptions** = `CreateUIToolsOptions` & `object`

Defined in: [src/tools/walletPayment.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/tools/walletPayment.ts#49)

Options for [createWalletPaymentTool](../functions/createWalletPaymentTool.md).

## Type Declaration

### pay()

> **pay**: (`request`: [`WalletPaymentRequest`](WalletPaymentRequest.md), `signal?`: `AbortSignal`) => `Promise`<[`WalletPaymentOutcome`](WalletPaymentOutcome.md)>

Pays the booking: stop before submitting if `signal` fires, and once submitted show the user the real outcome, because the tool result will read cancelled.

**Parameters**

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

`request`

</td>
<td>

[`WalletPaymentRequest`](WalletPaymentRequest.md)

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`WalletPaymentOutcome`](WalletPaymentOutcome.md)>
