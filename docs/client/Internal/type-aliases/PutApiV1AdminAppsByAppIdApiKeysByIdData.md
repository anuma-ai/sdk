# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:1855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1855)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:1859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1859)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:1860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1860)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1866)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1876](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1876)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:1877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1877)
