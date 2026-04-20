# GetApiV1DeveloperAppsByAppUuidApiKeysData

> **GetApiV1DeveloperAppsByAppUuidApiKeysData** = `object`

Defined in: [src/client/types.gen.ts:3927](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3927)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:3928](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3928)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3929](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3929)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:3935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3935)

**limit?**

> `optional` **limit**: `number`

Maximum number of API keys to return (default 50, max 100)

**offset?**

> `optional` **offset**: `number`

Number of API keys to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/api-keys"`

Defined in: [src/client/types.gen.ts:3945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3945)
