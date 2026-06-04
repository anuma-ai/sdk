# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4453)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4457)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4458](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4458)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4464](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4464)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4474](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4474)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4475](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4475)
