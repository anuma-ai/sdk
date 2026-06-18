# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:7519](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7519)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:7520](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7520)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:7521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7521)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:7527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7527)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:7537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7537)
