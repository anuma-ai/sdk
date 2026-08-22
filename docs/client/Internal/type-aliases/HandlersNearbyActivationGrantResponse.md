# HandlersNearbyActivationGrantResponse

> **HandlersNearbyActivationGrantResponse** = `object`

Defined in: [src/client/types.gen.ts:2455](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2455)

## Properties

### amount\_azeta?

> `optional` **amount\_azeta**: `string`

Defined in: [src/client/types.gen.ts:2461](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2461)

AmountAzeta is the reward in aZETA, as a decimal STRING: 10 ZETA is 1e19
aZETA, which exceeds what a JSON number survives intact in a JavaScript
caller.

***

### beneficiary\_account\_id?

> `optional` **beneficiary\_account\_id**: `number`

Defined in: [src/client/types.gen.ts:2465](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2465)

BeneficiaryAccountID is who is owed.

***

### created?

> `optional` **created**: `boolean`

Defined in: [src/client/types.gen.ts:2470](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2470)

Created reports whether THIS call produced the grant. False on a replay,
which is still a success.

***

### side?

> `optional` **side**: `string`

Defined in: [src/client/types.gen.ts:2474](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2474)

Side is "referrer" or "referee".

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2479](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2479)

Status is the payout lifecycle state. Always "owed" today — portal
records what it owes and has no ZETA sender yet.
