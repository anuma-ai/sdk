# HandlersReferralTesterResponse

> **HandlersReferralTesterResponse** = `object`

Defined in: [src/client/types.gen.ts:3135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3135)

## Properties

### bound\_via?

> `optional` **bound\_via**: `string`

Defined in: [src/client/types.gen.ts:3136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3136)

***

### referral\_code?

> `optional` **referral\_code**: `string`

Defined in: [src/client/types.gen.ts:3137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3137)

***

### referral\_count?

> `optional` **referral\_count**: `number`

Defined in: [src/client/types.gen.ts:3138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3138)

***

### share\_url?

> `optional` **share\_url**: `string`

Defined in: [src/client/types.gen.ts:3143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3143)

ShareURL is built server-side. Clients must use it verbatim — Prefinery's
own share\_link points at their domain, and ours is the one users see.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:3144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3144)

***

### updated\_at?

> `optional` **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3149)

UpdatedAt is the mirror-freshness signal: the last webhook, reconcile or
write-through that touched the row.

***

### waitlist\_position?

> `optional` **waitlist\_position**: `number`

Defined in: [src/client/types.gen.ts:3153](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3153)

WaitlistPosition is null once the tester is invited/active.
