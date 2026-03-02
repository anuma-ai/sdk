# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:1599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1599)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:1603](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1603)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:1604](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1604)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1610)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1620](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1620)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:1621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1621)
