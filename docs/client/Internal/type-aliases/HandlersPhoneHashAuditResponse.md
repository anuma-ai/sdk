# HandlersPhoneHashAuditResponse

> **HandlersPhoneHashAuditResponse** = `object`

Defined in: [src/client/types.gen.ts:2525](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2525)

## Properties

### already\_ok?

> `optional` **already\_ok**: `number`

Defined in: [src/client/types.gen.ts:2529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2529)

hash already matches Privy phone

***

### api\_errors?

> `optional` **api\_errors**: `number`

Defined in: [src/client/types.gen.ts:2530](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2530)

***

### conflicts?

> `optional` **conflicts**: `number`

Defined in: [src/client/types.gen.ts:2534](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2534)

unique-index collision

***

### entries?

> `optional` **entries**: [`HandlersPhoneHashAuditEntry`](HandlersPhoneHashAuditEntry.md)\[]

Defined in: [src/client/types.gen.ts:2538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2538)

Entries lists the accounts counted in Pending and APIErrors. Never null.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2539)

***

### next\_offset?

> `optional` **next\_offset**: `number`

Defined in: [src/client/types.gen.ts:2543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2543)

-1 when no more accounts remain

***

### no\_phone?

> `optional` **no\_phone**: `number`

Defined in: [src/client/types.gen.ts:2547](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2547)

Privy user has no linked phone

***

### no\_privy\_user?

> `optional` **no\_privy\_user**: `number`

Defined in: [src/client/types.gen.ts:2551](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2551)

Privy 404

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/client/types.gen.ts:2552](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2552)

***

### pending?

> `optional` **pending**: `number`

Defined in: [src/client/types.gen.ts:2556](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2556)

has Privy phone but hash missing/stale (audit)

***

### pepper\_configured?

> `optional` **pepper\_configured**: `boolean`

Defined in: [src/client/types.gen.ts:2565](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2565)

PepperConfigured reports whether PORTAL\_PHONE\_HASH\_PEPPER was set for this pass.
FALSE means no hash could be written regardless of what the counts below say, so the
whole report is about a deployment problem and NOT about phone coverage. It is
surfaced because the enforcement-flip decision is made from this response: nearby's
gate is fail-closed, so flipping with nothing written locks every user out. Reading
that risk correctly must not require correlating with pod logs.

***

### skipped\_no\_did?

> `optional` **skipped\_no\_did**: `number`

Defined in: [src/client/types.gen.ts:2566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2566)

***

### skipped\_no\_pepper?

> `optional` **skipped\_no\_pepper**: `number`

Defined in: [src/client/types.gen.ts:2575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2575)

The three causes previously conflated into one `skipped` counter. They call for
opposite operator responses, which is why they are no longer summed:
SkippedNoPepper  — CONFIG. Affects every account with a linked phone. Do not flip.
SkippedNotE164   — DATA, per account. Privy holds something unparseable. Investigate
the named accounts in Entries; does not block a flip.
SkippedNoDID     — DATA, per account. No privy\_did to resolve, so nothing to fetch.

***

### skipped\_not\_e164?

> `optional` **skipped\_not\_e164**: `number`

Defined in: [src/client/types.gen.ts:2576](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2576)

***

### total?

> `optional` **total**: `number`

Defined in: [src/client/types.gen.ts:2577](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2577)

***

### written?

> `optional` **written**: `number`

Defined in: [src/client/types.gen.ts:2581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2581)

newly written or updated (backfill)
