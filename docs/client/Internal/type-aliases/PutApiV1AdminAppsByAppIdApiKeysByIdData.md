# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4825](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4825)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4829)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4830)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4836](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4836)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4846](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4846)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4847](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4847)
