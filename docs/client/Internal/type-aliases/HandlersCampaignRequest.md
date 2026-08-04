# HandlersCampaignRequest

> **HandlersCampaignRequest** = `object`

Defined in: [src/client/types.gen.ts:1519](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1519)

## Properties

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:1520](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1520)

***

### data?

> `optional` **data**: `number`\[]

Defined in: [src/client/types.gen.ts:1521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1521)

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:1527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1527)

EventType is the dispatch event type (create-only; defaults to
"announcement.campaign"). Must map to the announcements category —
campaigns are marketing and may never ride a default-on category.

***

### locales?

> `optional` **locales**: `string`\[]

Defined in: [src/client/types.gen.ts:1528](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1528)

***

### min\_app\_version?

> `optional` **min\_app\_version**: `string`

Defined in: [src/client/types.gen.ts:1532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1532)

MinAppVersion is a dotted numeric version ("1.4.2").

***

### platforms?

> `optional` **platforms**: `string`\[]

Defined in: [src/client/types.gen.ts:1533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1533)

***

### scheduled\_at?

> `optional` **scheduled\_at**: `string`

Defined in: [src/client/types.gen.ts:1538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1538)

ScheduledAt (RFC 3339) is when the worker may start draining.
Required when status is "scheduled".

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1543)

Status may be "draft" (default on create) or "scheduled". Every
other transition belongs to the worker or the cancel endpoint.

***

### tiers?

> `optional` **tiers**: `string`\[]

Defined in: [src/client/types.gen.ts:1549](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1549)

Segment dimensions, AND-combined; empty list = no filter. Tiers are
subscription tiers ("basic"/"starter"/"pro"); platforms are
"ios"/"android"; locales accept full BCP-47 tags or primary subtags.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:1550](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1550)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:1555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1555)

URL is the client deep link opened on tap. Must match the mobile
client's allowed shape: "/(auth)/" prefix and no "..".
