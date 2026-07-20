# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:8079](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8079)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:8080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8080)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:8081](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8081)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:8087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8087)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:8097](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8097)
