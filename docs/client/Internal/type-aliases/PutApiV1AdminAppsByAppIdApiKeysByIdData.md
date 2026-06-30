# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4717)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4721)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4722](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4722)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4728)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4738](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4738)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4739)
