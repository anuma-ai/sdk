# GetApiV1DeveloperAppsByAppUuidUsageUsersData

> **GetApiV1DeveloperAppsByAppUuidUsageUsersData** = `object`

Defined in: [src/client/types.gen.ts:7433](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7433)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:7434](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7434)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:7435](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7435)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:7441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7441)

**end\_time?**

> `optional` **end\_time**: `string`

End time (RFC3339). Defaults to now.

**limit?**

> `optional` **limit**: `number`

Number of results (default 50, max 100)

**offset?**

> `optional` **offset**: `number`

Offset for pagination (default 0)

**start\_time?**

> `optional` **start\_time**: `string`

Start time (RFC3339). Defaults to 30 days ago.

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/usage/users"`

Defined in: [src/client/types.gen.ts:7459](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7459)
