# GetAdminReferralGrantsStatsData

> **GetAdminReferralGrantsStatsData** = `object`

Defined in: [src/client/types.gen.ts:5138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5138)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:5139](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5139)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:5140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5140)

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:5141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5141)

**limit?**

> `optional` **limit**: `number`

Maximum referrers to return (default 50, max 500)

**min\_referees?**

> `optional` **min\_referees**: `number`

Only include referrers with at least this many granted referees (default 2)

***

### url

> **url**: `"/admin/referral-grants/stats"`

Defined in: [src/client/types.gen.ts:5151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5151)
