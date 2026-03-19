# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:2107](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2107)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:2111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2111)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:2112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2112)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2118](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2118)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2128)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:2129](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2129)
