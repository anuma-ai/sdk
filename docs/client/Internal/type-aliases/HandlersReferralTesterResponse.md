# HandlersReferralTesterResponse

> **HandlersReferralTesterResponse** = `object`

Defined in: [src/client/types.gen.ts:2742](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2742)

## Properties

### bound\_via?

> `optional` **bound\_via**: `string`

Defined in: [src/client/types.gen.ts:2743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2743)

***

### referral\_code?

> `optional` **referral\_code**: `string`

Defined in: [src/client/types.gen.ts:2744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2744)

***

### referral\_count?

> `optional` **referral\_count**: `number`

Defined in: [src/client/types.gen.ts:2745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2745)

***

### share\_url?

> `optional` **share\_url**: `string`

Defined in: [src/client/types.gen.ts:2750](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2750)

ShareURL is built server-side. Clients must use it verbatim — Prefinery's
own share\_link points at their domain, and ours is the one users see.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2751](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2751)

***

### updated\_at?

> `optional` **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2756](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2756)

UpdatedAt is the mirror-freshness signal: the last webhook, reconcile or
write-through that touched the row.

***

### waitlist\_position?

> `optional` **waitlist\_position**: `number`

Defined in: [src/client/types.gen.ts:2760](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2760)

WaitlistPosition is null once the tester is invited/active.
