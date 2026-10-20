# createWalletPaymentTool

> **createWalletPaymentTool**(`options`: [`CreateWalletPaymentToolOptions`](../type-aliases/CreateWalletPaymentToolOptions.md)): `ToolConfig`

Defined in: [src/tools/walletPayment.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/tools/walletPayment.ts#160)

Create the prompt\_wallet\_payment tool, which collects the passengers on a card and then pays the booking through the caller's `pay` function.

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

[`CreateWalletPaymentToolOptions`](../type-aliases/CreateWalletPaymentToolOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`

## Example

```typescript
import { createWalletPaymentTool } from "@anuma/sdk/tools";

const paymentTool = createWalletPaymentTool({
  getContext: () => uiInteraction,
  getLastMessageId: () => lastMsgId,
  pay: (request, signal) => payFromWallet(request, signal),
});
```
