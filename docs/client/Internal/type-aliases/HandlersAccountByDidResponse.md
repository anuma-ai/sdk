# HandlersAccountByDidResponse

> **HandlersAccountByDidResponse** = `object`

Defined in: [src/client/types.gen.ts:1242](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1242)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:1243](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1243)

***

### internal\_tester?

> `optional` **internal\_tester**: `boolean`

Defined in: [src/client/types.gen.ts:1256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1256)

InternalTester exempts the account from the People Nearby onboarding geofence (#1578).

A sibling boolean rather than a field inside an `entitlements` object, following PhoneVerified:
this is a per-account GRANT, not a tier-derived cap, and nearby consumes it as an authorization
input on its own. The per-tier entitlements matrix is deferred — People Nearby has no pricing
yet — so shipping an entitlements object now would mean inventing values for four caps nobody
has decided.

Absent/false is the safe answer, and that is what an older portal build serves to a newer
nearby: the field simply unmarshals to false and nobody is exempt.

***

### nearby\_beta?

> `optional` **nearby\_beta**: `boolean`

Defined in: [src/client/types.gen.ts:1271](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1271)

NearbyBeta reports whether this account has been admitted to the People Nearby beta by
redeeming an access code (or by an admin grant).

It is what nearby's access gate reads. A SIBLING boolean rather than a second meaning loaded
onto InternalTester, because the two grants are not the same fact: the tester flag is a
standing staff bypass that also stands in for phone verification, while this one is an
admission held by people outside the company who are expected to verify like anyone else.

Absent/false is safe in BOTH directions here, and that is worth being explicit about because
it is the opposite of PhoneVerified's asymmetry. An older portal serving no field means "not
admitted", so a newer nearby with its gate armed refuses — visible, complained about, and
fixed by a deploy. There is no reading of a missing field that silently lets someone in.

***

### phone\_verified?

> `optional` **phone\_verified**: `boolean`

Defined in: [src/client/types.gen.ts:1272](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1272)

***

### privy\_did?

> `optional` **privy\_did**: `string`

Defined in: [src/client/types.gen.ts:1273](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1273)
