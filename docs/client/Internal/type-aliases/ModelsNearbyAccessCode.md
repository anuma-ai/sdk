# ModelsNearbyAccessCode

> **ModelsNearbyAccessCode** = `object`

Defined in: [src/client/types.gen.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#141)

## Properties

### code?

> `optional` **code**: `string`

Defined in: [src/client/types.gen.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#148)

Code is the NORMALIZED form: upper-cased, non-alphanumerics stripped
(db.NormalizeNearbyAccessCode). Stored in plaintext because an operator has to read it back
to send it, and hashing a short human-typed string protects little that the cap, the expiry
and the rate limit do not already bound.

***

### created\_at?

> `optional` **created\_at**: `string`

Defined in: [src/client/types.gen.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#149)

***

### expires\_at?

> `optional` **expires\_at**: `string`

Defined in: [src/client/types.gen.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#153)

ExpiresAt is nil for a code that never expires.

***

### id?

> `optional` **id**: `number`

Defined in: [src/client/types.gen.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#154)

***

### label?

> `optional` **label**: `string`

Defined in: [src/client/types.gen.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#159)

Label names the cohort this code was cut for ("beta-aug-2026"), so a list of codes is
readable months later without cross-referencing an email thread.

***

### max\_redemptions?

> `optional` **max\_redemptions**: `number`

Defined in: [src/client/types.gen.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#164)

MaxRedemptions is the hard cap on how many accounts this code can admit. Enforced by the
conditional UPDATE in ConsumeNearbyAccessCodeSeat, never by a read-then-write in Go.

***

### redeemed\_count?

> `optional` **redeemed\_count**: `number`

Defined in: [src/client/types.gen.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#170)

RedeemedCount moves only when a seat is actually consumed — that is, when the redeeming
account was newly admitted. A repeat submit by an account already in the beta does not
advance it, so the number stays readable as "people this code let in".

***

### revoked\_at?

> `optional` **revoked\_at**: `string`

Defined in: [src/client/types.gen.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#175)

RevokedAt is the kill switch: non-nil stops redemption immediately without deleting the row
or orphaning the attributions it already produced.
