# GetApiV1DeveloperAppsByAppUuidUsageData

> **GetApiV1DeveloperAppsByAppUuidUsageData** = `object`

Defined in: [src/client/types.gen.ts:3019](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3019)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:3020](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3020)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3021)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:3027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3027)

**end\_time?**

> `optional` **end\_time**: `string`

End time (RFC3339). Defaults to now.

**granularity?**

> `optional` **granularity**: `string`

Timeseries granularity: 'day' (default) or 'hour'

**start\_time?**

> `optional` **start\_time**: `string`

Start time (RFC3339). Defaults to 30 days ago.

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/usage"`

Defined in: [src/client/types.gen.ts:3041](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3041)
