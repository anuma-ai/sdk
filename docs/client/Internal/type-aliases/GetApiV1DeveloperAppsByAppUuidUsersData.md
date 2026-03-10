# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:3141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3141)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:3142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3142)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3143)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:3149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3149)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:3159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3159)
