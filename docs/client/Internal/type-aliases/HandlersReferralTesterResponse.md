# HandlersReferralTesterResponse

> **HandlersReferralTesterResponse** = `object`

Defined in: [src/client/types.gen.ts:2870](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2870)

## Properties

### bound\_via?

> `optional` **bound\_via**: `string`

Defined in: [src/client/types.gen.ts:2871](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2871)

***

### referral\_code?

> `optional` **referral\_code**: `string`

Defined in: [src/client/types.gen.ts:2872](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2872)

***

### referral\_count?

> `optional` **referral\_count**: `number`

Defined in: [src/client/types.gen.ts:2873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2873)

***

### share\_url?

> `optional` **share\_url**: `string`

Defined in: [src/client/types.gen.ts:2878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2878)

ShareURL is built server-side. Clients must use it verbatim — Prefinery's
own share\_link points at their domain, and ours is the one users see.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2879](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2879)

***

### updated\_at?

> `optional` **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:2884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2884)

UpdatedAt is the mirror-freshness signal: the last webhook, reconcile or
write-through that touched the row.

***

### waitlist\_position?

> `optional` **waitlist\_position**: `number`

Defined in: [src/client/types.gen.ts:2888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2888)

WaitlistPosition is null once the tester is invited/active.
