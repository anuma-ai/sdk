# SelectPaymentWalletResult

> **SelectPaymentWalletResult** = { `confirmed`: `true`; `funding_wallet`: `string`; `offer_id`: `string`; } | { `confirmed`: `false`; } | { `cancelled`: `true`; } | { `error_code`: `"wallets_unavailable"`; `retryable`: `true`; }

Defined in: [src/tools/walletPayment.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/tools/walletPayment.ts#20)

What the wallet picker returns to the model.
