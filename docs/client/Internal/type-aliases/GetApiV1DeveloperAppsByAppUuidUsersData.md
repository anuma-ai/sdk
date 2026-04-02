# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:4377](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4377)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4378)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4379](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4379)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:4385](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4385)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:4395](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4395)
