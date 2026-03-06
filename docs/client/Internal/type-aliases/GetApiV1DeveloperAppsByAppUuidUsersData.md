# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:3213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3213)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:3214](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3214)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3215](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3215)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:3221](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3221)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:3231](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3231)
