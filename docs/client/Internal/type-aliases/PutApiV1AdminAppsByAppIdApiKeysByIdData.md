# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:5473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5473)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:5477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5477)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:5478](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5478)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5484)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5494](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5494)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:5495](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5495)
