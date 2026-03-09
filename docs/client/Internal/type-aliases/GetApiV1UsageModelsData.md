# GetApiV1UsageModelsData

> **GetApiV1UsageModelsData** = `object`

Defined in: [src/client/types.gen.ts:4424](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4424)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4425](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4425)

***

### path?

> `optional` **path**: `never`

Defined in: [src/client/types.gen.ts:4426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4426)

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:4427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4427)

**end?**

> `optional` **end**: `string`

End of date range in RFC 3339 format (e.g. 2024-01-31T23:59:59Z). Must be used with start. Takes precedence over period.

**period?**

> `optional` **period**: `string`

Time period. Day aliases: 7d, 30d, 90d, 180d, 365d. Durations: 10m, 30m, 1h, 6h, 12h, 24h, 72h. Default: 30d. Max: 365d.

**start?**

> `optional` **start**: `string`

Start of date range in RFC 3339 format (e.g. 2024-01-01T00:00:00Z). Must be used with end. Takes precedence over period.

***

### url

> **url**: `"/api/v1/usage/models"`

Defined in: [src/client/types.gen.ts:4441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4441)
