# postApiV1SubscriptionsWebhook()

> **postApiV1SubscriptionsWebhook**\<`ThrowOnError`\>(`options`): `RequestResult`\<[`PostApiV1SubscriptionsWebhookResponses`](../type-aliases/PostApiV1SubscriptionsWebhookResponses.md), [`PostApiV1SubscriptionsWebhookErrors`](../type-aliases/PostApiV1SubscriptionsWebhookErrors.md), `ThrowOnError`\>

Defined in: [src/client/sdk.gen.ts:202](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L202)

Handle Stripe webhook

Receives and processes Stripe webhook events for subscription lifecycle management

## Type Parameters

### ThrowOnError

`ThrowOnError` *extends* `boolean` = `false`

## Parameters

### options

[`Options`](../type-aliases/Options.md)\<[`PostApiV1SubscriptionsWebhookData`](../type-aliases/PostApiV1SubscriptionsWebhookData.md), `ThrowOnError`\>

## Returns

`RequestResult`\<[`PostApiV1SubscriptionsWebhookResponses`](../type-aliases/PostApiV1SubscriptionsWebhookResponses.md), [`PostApiV1SubscriptionsWebhookErrors`](../type-aliases/PostApiV1SubscriptionsWebhookErrors.md), `ThrowOnError`\>
