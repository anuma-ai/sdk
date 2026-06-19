# GetApiV1DeveloperAppsByAppUuidApiKeysData

> **GetApiV1DeveloperAppsByAppUuidApiKeysData** = `object`

Defined in: [src/client/types.gen.ts:7105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7105)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:7106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7106)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:7107](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7107)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:7113](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7113)

**limit?**

> `optional` **limit**: `number`

Maximum number of API keys to return (default 50, max 100)

**offset?**

> `optional` **offset**: `number`

Number of API keys to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/api-keys"`

Defined in: [src/client/types.gen.ts:7123](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7123)
