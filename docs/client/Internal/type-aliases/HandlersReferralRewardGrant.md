# HandlersReferralRewardGrant

> **HandlersReferralRewardGrant** = `object`

Defined in: [src/client/types.gen.ts:3065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3065)

## Properties

### amount\_zeta?

> `optional` **amount\_zeta**: `string`

Defined in: [src/client/types.gen.ts:3070](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3070)

AmountZeta is the reward in whole ZETA as a decimal string. See
ReferralRewardsResponse for why every amount here is a string.

***

### created\_at?

> `optional` **created\_at**: `string`

Defined in: [src/client/types.gen.ts:3074](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3074)

CreatedAt is when the reward was earned, RFC 3339 UTC.

***

### side?

> `optional` **side**: [`ModelsGrantSide`](ModelsGrantSide.md)

Defined in: [src/client/types.gen.ts:3075](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3075)

***

### status?

> `optional` **status**: [`ModelsGrantStatus`](ModelsGrantStatus.md)

Defined in: [src/client/types.gen.ts:3076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3076)

***

### tx\_hash?

> `optional` **tx\_hash**: `string`

Defined in: [src/client/types.gen.ts:3080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3080)

TxHash is the payout transaction, null until one is submitted.
