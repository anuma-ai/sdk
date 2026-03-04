# GetApiV1DeveloperAppsByAppUuidUsersData

> **GetApiV1DeveloperAppsByAppUuidUsersData** = `object`

Defined in: [src/client/types.gen.ts:3092](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3092)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:3093](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3093)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3094)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:3100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3100)

**limit?**

> `optional` **limit**: `number`

Maximum number of users to return (default 50, max 200)

**offset?**

> `optional` **offset**: `number`

Number of users to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/users"`

Defined in: [src/client/types.gen.ts:3110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3110)
