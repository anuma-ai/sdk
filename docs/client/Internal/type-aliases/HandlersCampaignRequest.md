# HandlersCampaignRequest

> **HandlersCampaignRequest** = `object`

Defined in: [src/client/types.gen.ts:1520](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1520)

## Properties

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:1521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1521)

***

### data?

> `optional` **data**: `number`\[]

Defined in: [src/client/types.gen.ts:1522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1522)

***

### locales?

> `optional` **locales**: `string`\[]

Defined in: [src/client/types.gen.ts:1523](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1523)

***

### min\_app\_version?

> `optional` **min\_app\_version**: `string`

Defined in: [src/client/types.gen.ts:1527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1527)

MinAppVersion is a dotted numeric version ("1.4.2").

***

### platforms?

> `optional` **platforms**: `string`\[]

Defined in: [src/client/types.gen.ts:1528](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1528)

***

### scheduled\_at?

> `optional` **scheduled\_at**: `string`

Defined in: [src/client/types.gen.ts:1533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1533)

ScheduledAt (RFC 3339) is when the worker may start draining.
Required when status is "scheduled".

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1538)

Status may be "draft" (default on create) or "scheduled". Every
other transition belongs to the worker or the cancel endpoint.

***

### tiers?

> `optional` **tiers**: `string`\[]

Defined in: [src/client/types.gen.ts:1544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1544)

Segment dimensions, AND-combined; empty list = no filter. Tiers are
subscription tiers ("basic"/"starter"/"pro"); platforms are
"ios"/"android"; locales accept full BCP-47 tags or primary subtags.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:1545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1545)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:1550](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1550)

URL is the client deep link opened on tap. Must match the mobile
client's allowed shape: "/(auth)/" prefix and no "..".
