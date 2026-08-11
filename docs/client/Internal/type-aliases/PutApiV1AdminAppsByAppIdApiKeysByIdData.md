# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:5208](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5208)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:5212](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5212)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:5213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5213)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5219](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5219)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5229](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5229)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:5230](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5230)
