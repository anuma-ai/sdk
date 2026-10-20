# CreateWalletPaymentToolOptions

> **CreateWalletPaymentToolOptions** = `CreateUIToolsOptions` & `object`

Defined in: [src/tools/walletPayment.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/tools/walletPayment.ts#50)

Options for [createWalletPaymentTool](../functions/createWalletPaymentTool.md).

## Type Declaration

### pay()

> **pay**: (`request`: [`WalletPaymentRequest`](WalletPaymentRequest.md), `signal?`: `AbortSignal`) => `Promise`<[`WalletPaymentOutcome`](WalletPaymentOutcome.md)>

Pays the booking: if `signal` fires before submitting, stop there; if it fires after submitting, show the user the real outcome, because the tool result will read cancelled.

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
