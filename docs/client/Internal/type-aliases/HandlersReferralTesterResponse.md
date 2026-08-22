# HandlersReferralTesterResponse

> **HandlersReferralTesterResponse** = `object`

Defined in: [src/client/types.gen.ts:2944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2944)

## Properties

### bound\_via?

> `optional` **bound\_via**: `string`

Defined in: [src/client/types.gen.ts:2945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2945)

***

### referral\_code?

> `optional` **referral\_code**: `string`

Defined in: [src/client/types.gen.ts:2946](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2946)

***

### referral\_count?

> `optional` **referral\_count**: `number`

Defined in: [src/client/types.gen.ts:2947](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2947)

***

### share\_url?

> `optional` **share\_url**: `string`

Defined in: [src/client/types.gen.ts:2952](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2952)

ShareURL is built server-side. Clients must use it verbatim — Prefinery's
own share\_link points at their domain, and ours is the one users see.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2953)

***

### updated\_at?

> `optional` **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2958)

UpdatedAt is the mirror-freshness signal: the last webhook, reconcile or
write-through that touched the row.

***

### waitlist\_position?

> `optional` **waitlist\_position**: `number`

Defined in: [src/client/types.gen.ts:2962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2962)

WaitlistPosition is null once the tester is invited/active.
