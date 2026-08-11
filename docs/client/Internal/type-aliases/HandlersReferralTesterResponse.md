# HandlersReferralTesterResponse

> **HandlersReferralTesterResponse** = `object`

Defined in: [src/client/types.gen.ts:2755](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2755)

## Properties

### bound\_via?

> `optional` **bound\_via**: `string`

Defined in: [src/client/types.gen.ts:2756](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2756)

***

### referral\_code?

> `optional` **referral\_code**: `string`

Defined in: [src/client/types.gen.ts:2757](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2757)

***

### referral\_count?

> `optional` **referral\_count**: `number`

Defined in: [src/client/types.gen.ts:2758](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2758)

***

### share\_url?

> `optional` **share\_url**: `string`

Defined in: [src/client/types.gen.ts:2763](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2763)

ShareURL is built server-side. Clients must use it verbatim — Prefinery's
own share\_link points at their domain, and ours is the one users see.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2764](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2764)

***

### updated\_at?

> `optional` **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2769](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2769)

UpdatedAt is the mirror-freshness signal: the last webhook, reconcile or
write-through that touched the row.

***

### waitlist\_position?

> `optional` **waitlist\_position**: `number`

Defined in: [src/client/types.gen.ts:2773](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2773)

WaitlistPosition is null once the tester is invited/active.
