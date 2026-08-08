# HandlersWaitlistJoinResponse

> **HandlersWaitlistJoinResponse** = `object`

Defined in: [src/client/types.gen.ts:3451](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3451)

## Properties

### bound?

> `optional` **bound**: `boolean`

Defined in: [src/client/types.gen.ts:3452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3452)

***

### referred\_by\_applied?

> `optional` **referred\_by\_applied**: `boolean`

Defined in: [src/client/types.gen.ts:3460](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3460)

ReferredByApplied is null when no code was sent, false when a code WAS
sent but did not attribute this signup to anyone — malformed, a
self-referral, unresolvable, or sent on an account that is already bound
(Prefinery attributes on create and never re-parents). The join succeeds
either way.

***

### reward?

> `optional` **reward**: [`HandlersReferralRewardResponse`](HandlersReferralRewardResponse.md)

Defined in: [src/client/types.gen.ts:3461](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3461)

***

### tester?

> `optional` **tester**: [`HandlersReferralTesterResponse`](HandlersReferralTesterResponse.md)

Defined in: [src/client/types.gen.ts:3462](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3462)
