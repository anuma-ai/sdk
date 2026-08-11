# HandlersCampaignRequest

> **HandlersCampaignRequest** = `object`

Defined in: [src/client/types.gen.ts:1532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1532)

## Properties

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:1533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1533)

***

### data?

> `optional` **data**: `number`\[]

Defined in: [src/client/types.gen.ts:1534](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1534)

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:1540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1540)

EventType is the dispatch event type (create-only; defaults to
"announcement.campaign"). Must map to the announcements category —
campaigns are marketing and may never ride a default-on category.

***

### locales?

> `optional` **locales**: `string`\[]

Defined in: [src/client/types.gen.ts:1541](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1541)

***

### min\_app\_version?

> `optional` **min\_app\_version**: `string`

Defined in: [src/client/types.gen.ts:1545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1545)

MinAppVersion is a dotted numeric version ("1.4.2").

***

### platforms?

> `optional` **platforms**: `string`\[]

Defined in: [src/client/types.gen.ts:1546](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1546)

***

### scheduled\_at?

> `optional` **scheduled\_at**: `string`

Defined in: [src/client/types.gen.ts:1551](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1551)

ScheduledAt (RFC 3339) is when the worker may start draining.
Required when status is "scheduled".

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1556](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1556)

Status may be "draft" (default on create) or "scheduled". Every
other transition belongs to the worker or the cancel endpoint.

***

### tiers?

> `optional` **tiers**: `string`\[]

Defined in: [src/client/types.gen.ts:1562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1562)

Segment dimensions, AND-combined; empty list = no filter. Tiers are
subscription tiers ("basic"/"starter"/"pro"); platforms are
"ios"/"android"; locales accept full BCP-47 tags or primary subtags.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:1563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1563)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:1568](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1568)

URL is the client deep link opened on tap. Must match the mobile
client's allowed shape: "/(auth)/" prefix and no "..".
