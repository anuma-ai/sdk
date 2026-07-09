# HandlersUpgradeSubscriptionResponse

> **HandlersUpgradeSubscriptionResponse** = `object`

Defined in: [src/client/types.gen.ts:2850](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2850)

## Properties

### changed?

> `optional` **changed**: `boolean`

Defined in: [src/client/types.gen.ts:2860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2860)

Changed is false when the request was an idempotent no-op (the user was
already on the requested tier+interval) and true when the subscription was
actually upgraded. Clients should gate upgrade side-effects (success toast,
plan\_upgraded analytics, ad-conversion events) on Changed so a stale client
re-submitting the current plan doesn't emit spurious conversions. Either way
NewPlan/NewInterval reflect the authoritative current plan, so clients can
trust them to self-correct stale local state without a follow-up status fetch.

***

### message

> **message**: `string`

Defined in: [src/client/types.gen.ts:2861](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2861)

***

### new\_interval

> **new\_interval**: `string`

Defined in: [src/client/types.gen.ts:2862](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2862)

***

### new\_plan

> **new\_plan**: `string`

Defined in: [src/client/types.gen.ts:2863](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2863)
