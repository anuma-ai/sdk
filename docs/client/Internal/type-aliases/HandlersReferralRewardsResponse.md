# HandlersReferralRewardsResponse

> **HandlersReferralRewardsResponse** = `object`

Defined in: [src/client/types.gen.ts:3088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3088)

## Properties

### grants?

> `optional` **grants**: [`HandlersReferralRewardGrant`](HandlersReferralRewardGrant.md)\[]

Defined in: [src/client/types.gen.ts:3094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3094)

Grants is the individual rewards, newest first. NEVER null: a client that
maps over this crashes on a null, and "no rewards yet" is the majority
case, not an error case.

***

### owed\_zeta?

> `optional` **owed\_zeta**: `string`

Defined in: [src/client/types.gen.ts:3098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3098)

OwedZeta is earned and not yet paid — statuses "owed" and "failed".

***

### payable?

> `optional` **payable**: `boolean`

Defined in: [src/client/types.gen.ts:3104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3104)

Payable reports whether this account currently has an address a reward
can be sent to. False is a normal, recoverable state: the grant stays
owed indefinitely and becomes payable the moment a wallet is bound.

***

### payouts\_enabled?

> `optional` **payouts\_enabled**: `boolean`

Defined in: [src/client/types.gen.ts:3123](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3123)

PayoutsEnabled reports whether the treasury is meant to pay grants out in
this environment: PORTAL\_REFERRAL\_SENDER\_ENABLED on the API process.
False means nobody is being paid, regardless of Payable.

TRUE IS OPERATOR INTENT, not proof that a transfer moved. A broadcast
needs the payout signing key as well, and that key is worker-only - it
never reaches this process, so this field cannot see it. The staged
rollout therefore has a window, flag on and key not delivered yet, where
this reads true while the sender dry-runs and pays nobody. That window is
deliberate: it is the order the rollout is meant to happen in, and the
alternative reading is worse, because a field that also demanded the key
would be false in every API build including one whose worker is paying.

So a client may say "the treasury is open" on true, and must not say
"your reward is on its way". SentZeta and a grant's tx\_hash are the
per-grant truth, and they move only when a transfer really lands.

***

### sent\_zeta?

> `optional` **sent\_zeta**: `string`

Defined in: [src/client/types.gen.ts:3127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3127)

SentZeta is paid — status "sent".

***

### total\_earned\_zeta?

> `optional` **total\_earned\_zeta**: `string`

Defined in: [src/client/types.gen.ts:3132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3132)

TotalEarnedZeta is every grant this account holds, whatever its status.
It always equals OwedZeta + SentZeta.
