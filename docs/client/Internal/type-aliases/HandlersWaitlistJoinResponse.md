# HandlersWaitlistJoinResponse

> **HandlersWaitlistJoinResponse** = `object`

Defined in: [src/client/types.gen.ts:3599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3599)

## Properties

### bound?

> `optional` **bound**: `boolean`

Defined in: [src/client/types.gen.ts:3600](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3600)

***

### referred\_by\_applied?

> `optional` **referred\_by\_applied**: `boolean`

Defined in: [src/client/types.gen.ts:3608](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3608)

ReferredByApplied is null when no code was sent, false when a code WAS
sent but did not attribute this signup to anyone — malformed, a
self-referral, unresolvable, or sent on an account that is already bound
(Prefinery attributes on create and never re-parents). The join succeeds
either way.

***

### reward?

> `optional` **reward**: [`HandlersReferralRewardResponse`](HandlersReferralRewardResponse.md)

Defined in: [src/client/types.gen.ts:3609](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3609)

***

### tester?

> `optional` **tester**: [`HandlersReferralTesterResponse`](HandlersReferralTesterResponse.md)

Defined in: [src/client/types.gen.ts:3610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3610)
