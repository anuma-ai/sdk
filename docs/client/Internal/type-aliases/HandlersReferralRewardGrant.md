# HandlersReferralRewardGrant

> **HandlersReferralRewardGrant** = `object`

Defined in: [src/client/types.gen.ts:2887](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2887)

## Properties

### amount\_zeta?

> `optional` **amount\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2892](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2892)

AmountZeta is the reward in whole ZETA as a decimal string. See
ReferralRewardsResponse for why every amount here is a string.

***

### created\_at?

> `optional` **created\_at**: `string`

Defined in: [src/client/types.gen.ts:2896](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2896)

CreatedAt is when the reward was earned, RFC 3339 UTC.

***

### side?

> `optional` **side**: [`ModelsGrantSide`](ModelsGrantSide.md)

Defined in: [src/client/types.gen.ts:2897](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2897)

***

### status?

> `optional` **status**: [`ModelsGrantStatus`](ModelsGrantStatus.md)

Defined in: [src/client/types.gen.ts:2898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2898)

***

### tx\_hash?

> `optional` **tx\_hash**: `string`

Defined in: [src/client/types.gen.ts:2902](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2902)

TxHash is the payout transaction, null until one is submitted.
