# HandlersListTotals

> **HandlersListTotals** = `object`

Defined in: [src/client/types.gen.ts:2137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2137)

## Properties

### ai\_credits?

> `optional` **ai\_credits**: `number`

Defined in: [src/client/types.gen.ts:2142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2142)

AICredits is the account's current spendable credit balance accrued from staking — active
(unspent, unexpired) grants from the stake-to-earn drip, in whole credits.

***

### pro?

> `optional` **pro**: [`HandlersProInfo`](HandlersProInfo.md)

Defined in: [src/client/types.gen.ts:2143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2143)

***

### staked\_zeta?

> `optional` **staked\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2144)

***

### zeta\_rewards?

> `optional` **zeta\_rewards**: `string`

Defined in: [src/client/types.gen.ts:2149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2149)

ZetaRewards is the account's total pending (unclaimed) on-chain staking rewards across all
bound wallets, in ZETA.
