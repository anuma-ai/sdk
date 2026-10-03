# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:5733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5733)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:5737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5737)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:5738](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5738)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5744)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5754](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5754)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:5755](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5755)
