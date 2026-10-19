# WalletPaymentOutcome

> **WalletPaymentOutcome** = { `paid`: `true`; `provider`: `string`; `reference`: `string`; `status`: `string`; } | { `error_code`: `string`; `paid`: `false`; `retryable`: `boolean`; }

Defined in: [src/tools/walletPayment.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/tools/walletPayment.ts#36)

What the caller's `pay` function resolves with.
