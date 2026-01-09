# postApiV1SubscriptionsRenew()

> **postApiV1SubscriptionsRenew**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsRenewData`](../type-aliases/PostApiV1SubscriptionsRenewData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsRenewResponses`](../type-aliases/PostApiV1SubscriptionsRenewResponses.md), [`PostApiV1SubscriptionsRenewErrors`](../type-aliases/PostApiV1SubscriptionsRenewErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L178)

Renew subscription

Reactivates a subscription that was scheduled for cancellation (undoes cancel\_at\_period\_end)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `ThrowOnError` *extends* `boolean` | `false` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsRenewData`](../type-aliases/PostApiV1SubscriptionsRenewData.md), `ThrowOnError`> |

## Returns

`RequestResult`<[`PostApiV1SubscriptionsRenewResponses`](../type-aliases/PostApiV1SubscriptionsRenewResponses.md), [`PostApiV1SubscriptionsRenewErrors`](../type-aliases/PostApiV1SubscriptionsRenewErrors.md), `ThrowOnError`>
