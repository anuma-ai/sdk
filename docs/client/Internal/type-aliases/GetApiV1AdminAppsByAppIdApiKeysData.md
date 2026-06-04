# GetApiV1AdminAppsByAppIdApiKeysData

> **GetApiV1AdminAppsByAppIdApiKeysData** = `object`

Defined in: [src/client/types.gen.ts:4247](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4247)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4248)

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4249](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4249)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4255](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4255)

**app\_id**

> **app\_id**: `number`

App ID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:4261](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4261)

**limit?**

> `optional` **limit**: `number`

Maximum number of API keys to return (default 50, max 100)

**offset?**

> `optional` **offset**: `number`

Number of API keys to skip (default 0)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys"`

Defined in: [src/client/types.gen.ts:4271](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4271)
