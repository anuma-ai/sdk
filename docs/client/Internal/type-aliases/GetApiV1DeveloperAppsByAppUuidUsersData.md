# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:7777](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7777)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:7778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7778)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:7779](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7779)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:7785](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7785)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:7795](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7795)
