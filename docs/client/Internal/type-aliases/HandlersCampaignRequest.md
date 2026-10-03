# HandlersCampaignRequest

> **HandlersCampaignRequest** = `object`

Defined in: [src/client/types.gen.ts:1660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1660)

## Properties

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:1661](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1661)

***

### data?

> `optional` **data**: `number`\[]

Defined in: [src/client/types.gen.ts:1662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1662)

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:1668](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1668)

EventType is the dispatch event type (create-only; defaults to
"announcement.campaign"). Must map to the announcements category —
campaigns are marketing and may never ride a default-on category.

***

### locales?

> `optional` **locales**: `string`\[]

Defined in: [src/client/types.gen.ts:1669](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1669)

***

### min\_app\_version?

> `optional` **min\_app\_version**: `string`

Defined in: [src/client/types.gen.ts:1673](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1673)

MinAppVersion is a dotted numeric version ("1.4.2").

***

### platforms?

> `optional` **platforms**: `string`\[]

Defined in: [src/client/types.gen.ts:1674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1674)

***

### scheduled\_at?

> `optional` **scheduled\_at**: `string`

Defined in: [src/client/types.gen.ts:1679](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1679)

ScheduledAt (RFC 3339) is when the worker may start draining.
Required when status is "scheduled".

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1684](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1684)

Status may be "draft" (default on create) or "scheduled". Every
other transition belongs to the worker or the cancel endpoint.

***

### tiers?

> `optional` **tiers**: `string`\[]

Defined in: [src/client/types.gen.ts:1690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1690)

Segment dimensions, AND-combined; empty list = no filter. Tiers are
subscription tiers ("basic"/"starter"/"pro"); platforms are
"ios"/"android"; locales accept full BCP-47 tags or primary subtags.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:1691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1691)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:1696](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1696)

URL is the client deep link opened on tap. Must match the mobile
client's allowed shape: "/(auth)/" prefix and no "..".
