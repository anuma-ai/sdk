# GetApiV1AdminAppsByAppIdApiKeysData

> **GetApiV1AdminAppsByAppIdApiKeysData** = `object`

Defined in: [src/client/types.gen.ts:4381](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4381)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4382)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4383](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4383)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4389](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4389)

**app\_id**

> **app\_id**: `number`

App ID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:4395](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4395)

**limit?**

> `optional` **limit**: `number`

Maximum number of API keys to return (default 50, max 100)

**offset?**

> `optional` **offset**: `number`

Number of API keys to skip (default 0)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys"`

Defined in: [src/client/types.gen.ts:4405](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4405)
