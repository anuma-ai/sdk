# HandlersNearbyActivationGrantResponse

> **HandlersNearbyActivationGrantResponse** = `object`

Defined in: [src/client/types.gen.ts:2629](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2629)

## Properties

### amount\_azeta?

> `optional` **amount\_azeta**: `string`

Defined in: [src/client/types.gen.ts:2635](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2635)

AmountAzeta is the reward in aZETA, as a decimal STRING: 10 ZETA is 1e19
aZETA, which exceeds what a JSON number survives intact in a JavaScript
caller.

***

### beneficiary\_account\_id?

> `optional` **beneficiary\_account\_id**: `number`

Defined in: [src/client/types.gen.ts:2639](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2639)

BeneficiaryAccountID is who is owed.

***

### created?

> `optional` **created**: `boolean`

Defined in: [src/client/types.gen.ts:2644](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2644)

Created reports whether THIS call produced the grant. False on a replay,
which is still a success.

***

### side?

> `optional` **side**: `string`

Defined in: [src/client/types.gen.ts:2648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2648)

Side is "referrer" or "referee".

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2653](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2653)

Status is the payout lifecycle state. Always "owed" today — portal
records what it owes and has no ZETA sender yet.
