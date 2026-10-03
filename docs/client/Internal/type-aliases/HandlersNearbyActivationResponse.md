# HandlersNearbyActivationResponse

> **HandlersNearbyActivationResponse** = `object`

Defined in: [src/client/types.gen.ts:2677](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2677)

## Properties

### grants?

> `optional` **grants**: [`HandlersNearbyActivationGrantResponse`](HandlersNearbyActivationGrantResponse.md)\[]

Defined in: [src/client/types.gen.ts:2682](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2682)

Grants is never null; an empty array means the activation earned
nothing, and Reason says why.

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:2691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2691)

Reason explains an empty Grants ("grants\_disabled", "inactive\_area",
"referrer\_not\_resolved", "price\_unavailable", "self\_referral"). Empty when
grants exist.

Informational: none of these values is an error and none of them should
make the caller retry differently.

***

### recorded?

> `optional` **recorded**: `boolean`

Defined in: [src/client/types.gen.ts:2696](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2696)

Recorded reports whether this call stored the activation. False means it
was already known — a replay, which is expected.
