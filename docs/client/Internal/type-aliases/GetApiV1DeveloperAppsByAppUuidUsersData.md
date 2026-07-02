# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:7789](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7789)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:7790](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7790)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:7791](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7791)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:7797](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7797)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:7807](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7807)
