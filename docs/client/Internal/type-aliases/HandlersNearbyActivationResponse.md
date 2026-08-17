# HandlersNearbyActivationResponse

> **HandlersNearbyActivationResponse** = `object`

Defined in: [src/client/types.gen.ts:2477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2477)

## Properties

### grants?

> `optional` **grants**: [`HandlersNearbyActivationGrantResponse`](HandlersNearbyActivationGrantResponse.md)\[]

Defined in: [src/client/types.gen.ts:2482](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2482)

Grants is never null; an empty array means the activation earned
nothing, and Reason says why.

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:2490](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2490)

Reason explains an empty Grants ("grants\_disabled", "inactive\_area",
"referrer\_not\_resolved", "self\_referral"). Empty when grants exist.

Informational: none of these values is an error and none of them should
make the caller retry differently.

***

### recorded?

> `optional` **recorded**: `boolean`

Defined in: [src/client/types.gen.ts:2495](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2495)

Recorded reports whether this call stored the activation. False means it
was already known — a replay, which is expected.
