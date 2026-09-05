# HandlersCreateNearbyAccessCodeRequest

> **HandlersCreateNearbyAccessCodeRequest** = `object`

Defined in: [src/client/types.gen.ts:2029](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2029)

## Properties

### code?

> `optional` **code**: `string`

Defined in: [src/client/types.gen.ts:2035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2035)

Code is the human form; it is normalized (upper-cased, non-alphanumerics stripped) before
storage, so "anuma-beta-7q4m" and "ANUMABETA7Q4M" create the same code — and the second
attempt is a duplicate error rather than a second code nobody can tell apart.

***

### expires\_at?

> `optional` **expires\_at**: `string`

Defined in: [src/client/types.gen.ts:2039](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2039)

ExpiresAt is optional but strongly recommended. Nil mints a code that never expires.

***

### label?

> `optional` **label**: `string`

Defined in: [src/client/types.gen.ts:2040](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2040)

***

### max\_redemptions?

> `optional` **max\_redemptions**: `number`

Defined in: [src/client/types.gen.ts:2045](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2045)

MaxRedemptions is required and must be positive: a code with no cap is the one thing this
design does not allow, because the cap is what bounds a leak.
