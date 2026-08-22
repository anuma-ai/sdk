# HandlersReferralRewardsResponse

> **HandlersReferralRewardsResponse** = `object`

Defined in: [src/client/types.gen.ts:2910](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2910)

## Properties

### grants?

> `optional` **grants**: [`HandlersReferralRewardGrant`](HandlersReferralRewardGrant.md)\[]

Defined in: [src/client/types.gen.ts:2916](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2916)

Grants is the individual rewards, newest first. NEVER null: a client that
maps over this crashes on a null, and "no rewards yet" is the majority
case, not an error case.

***

### owed\_zeta?

> `optional` **owed\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2920](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2920)

OwedZeta is earned and not yet paid — statuses "owed" and "failed".

***

### payable?

> `optional` **payable**: `boolean`

Defined in: [src/client/types.gen.ts:2926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2926)

Payable reports whether this account currently has an address a reward
can be sent to. False is a normal, recoverable state: the grant stays
owed indefinitely and becomes payable the moment a wallet is bound.

***

### payouts\_enabled?

> `optional` **payouts\_enabled**: `boolean`

Defined in: [src/client/types.gen.ts:2932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2932)

PayoutsEnabled reports whether the treasury is paying grants out at all.
False means nobody is being paid yet, regardless of Payable. It is false
in every current build: no deployment can transfer ZETA yet.

***

### sent\_zeta?

> `optional` **sent\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2936)

SentZeta is paid — status "sent".

***

### total\_earned\_zeta?

> `optional` **total\_earned\_zeta**: `string`

Defined in: [src/client/types.gen.ts:2941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2941)

TotalEarnedZeta is every grant this account holds, whatever its status.
It always equals OwedZeta + SentZeta.
