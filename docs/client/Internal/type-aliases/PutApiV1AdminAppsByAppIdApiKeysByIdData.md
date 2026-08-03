# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:5038](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5038)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:5042](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5042)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:5043](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5043)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5049](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5049)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5059](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5059)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:5060](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5060)
