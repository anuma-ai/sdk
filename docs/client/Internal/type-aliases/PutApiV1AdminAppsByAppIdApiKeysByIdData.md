# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4881](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4881)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4885](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4885)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4886)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4892](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4892)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4902](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4902)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4903](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4903)
