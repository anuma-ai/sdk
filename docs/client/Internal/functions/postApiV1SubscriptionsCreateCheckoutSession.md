# postApiV1SubscriptionsCreateCheckoutSession()

> **postApiV1SubscriptionsCreateCheckoutSession**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCreateCheckoutSessionData`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsCreateCheckoutSessionResponses`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionResponses.md), [`PostApiV1SubscriptionsCreateCheckoutSessionErrors`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L154)

Create checkout session

Creates a Stripe Checkout Session for Pro subscription and returns the checkout URL

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `ThrowOnError` *extends* `boolean` | `false` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCreateCheckoutSessionData`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionData.md), `ThrowOnError`> |

## Returns

`RequestResult`<[`PostApiV1SubscriptionsCreateCheckoutSessionResponses`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionResponses.md), [`PostApiV1SubscriptionsCreateCheckoutSessionErrors`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionErrors.md), `ThrowOnError`>
