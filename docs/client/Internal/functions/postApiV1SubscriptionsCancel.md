# postApiV1SubscriptionsCancel

> **postApiV1SubscriptionsCancel**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCancelData`](../type-aliases/PostApiV1SubscriptionsCancelData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsCancelResponses`](../type-aliases/PostApiV1SubscriptionsCancelResponses.md), [`PostApiV1SubscriptionsCancelErrors`](../type-aliases/PostApiV1SubscriptionsCancelErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L142)

Cancel subscription

Cancels the user's subscription at the end of the current billing period (cancel\_at\_period\_end)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `ThrowOnError` *extends* `boolean` | `false` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCancelData`](../type-aliases/PostApiV1SubscriptionsCancelData.md), `ThrowOnError`> |

## Returns

`RequestResult`<[`PostApiV1SubscriptionsCancelResponses`](../type-aliases/PostApiV1SubscriptionsCancelResponses.md), [`PostApiV1SubscriptionsCancelErrors`](../type-aliases/PostApiV1SubscriptionsCancelErrors.md), `ThrowOnError`>
