# HandlersReferralGrantReferrerStatResponse

> **HandlersReferralGrantReferrerStatResponse** = `object`

Defined in: [src/client/types.gen.ts:2999](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2999)

## Properties

### referee\_count?

> `optional` **referee\_count**: `number`

Defined in: [src/client/types.gen.ts:3003](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3003)

RefereeCount is how many distinct referees earned this referrer a grant.

***

### referrer\_account\_id?

> `optional` **referrer\_account\_id**: `number`

Defined in: [src/client/types.gen.ts:3004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3004)

***

### referrer\_phone\_verified?

> `optional` **referrer\_phone\_verified**: `boolean`

Defined in: [src/client/types.gen.ts:3008](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3008)

ReferrerPhoneVerified reports whether the referrer verified their own phone.

***

### total\_azeta?

> `optional` **total\_azeta**: `string`

Defined in: [src/client/types.gen.ts:3013](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3013)

TotalAzeta is what this referrer has been granted, in aZETA, as a
decimal string (the values exceed a safe JSON number).

***

### unverified\_referee\_count?

> `optional` **unverified\_referee\_count**: `number`

Defined in: [src/client/types.gen.ts:3018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3018)

UnverifiedRefereeCount is how many of those referees have no verified
phone. A high ratio is the strongest signal this data supports.
