# HandlersAccountByDidResponse

> **HandlersAccountByDidResponse** = `object`

Defined in: [src/client/types.gen.ts:1159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1159)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:1160](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1160)

***

### internal\_tester?

> `optional` **internal\_tester**: `boolean`

Defined in: [src/client/types.gen.ts:1173](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1173)

InternalTester exempts the account from the People Nearby onboarding geofence (#1578).

A sibling boolean rather than a field inside an `entitlements` object, following PhoneVerified:
this is a per-account GRANT, not a tier-derived cap, and nearby consumes it as an authorization
input on its own. The per-tier entitlements matrix is deferred — People Nearby has no pricing
yet — so shipping an entitlements object now would mean inventing values for four caps nobody
has decided.

Absent/false is the safe answer, and that is what an older portal build serves to a newer
nearby: the field simply unmarshals to false and nobody is exempt.

***

### phone\_verified?

> `optional` **phone\_verified**: `boolean`

Defined in: [src/client/types.gen.ts:1174](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1174)

***

### privy\_did?

> `optional` **privy\_did**: `string`

Defined in: [src/client/types.gen.ts:1175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1175)
