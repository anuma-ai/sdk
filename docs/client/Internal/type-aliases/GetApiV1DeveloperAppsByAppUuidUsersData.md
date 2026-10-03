# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:9742](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9742)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9743)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9744)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:9750](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9750)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:9760](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9760)
