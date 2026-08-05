# HandlersPhoneHashAuditEntry

> **HandlersPhoneHashAuditEntry** = `object`

Defined in: [src/client/types.gen.ts:2426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2426)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2427)

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/types.gen.ts:2434](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2434)

Reason is "pending" (Privy has a phone, stored hash missing or stale),
"api\_error" (transient Privy fetch / DB write failure — batch will retry), or
"not\_e164" (Privy holds a number this pass could not normalise — a per-account data
problem worth naming, since the operator can only chase it if they know which rows).
