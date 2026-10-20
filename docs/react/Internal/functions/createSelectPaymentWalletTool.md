# createSelectPaymentWalletTool

> **createSelectPaymentWalletTool**(`options`: [`CreateSelectPaymentWalletToolOptions`](../type-aliases/CreateSelectPaymentWalletToolOptions.md)): `ToolConfig`

Defined in: [src/tools/walletPayment.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/tools/walletPayment.ts#79)

Create the select\_payment\_wallet tool, which shows the user's wallets for a flight offer and returns the one they chose.

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

[`CreateSelectPaymentWalletToolOptions`](../type-aliases/CreateSelectPaymentWalletToolOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`

## Example

```typescript
import { createSelectPaymentWalletTool } from "@anuma/sdk/tools";

const selectWalletTool = createSelectPaymentWalletTool({
  getContext: () => uiInteraction,
  getLastMessageId: () => lastMsgId,
  listWallets: async () => wallets,
});
```
