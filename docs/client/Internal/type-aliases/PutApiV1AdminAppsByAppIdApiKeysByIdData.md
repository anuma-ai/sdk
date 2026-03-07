# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:2078](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2078)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:2082](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2082)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:2083](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2083)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2089)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2099)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:2100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2100)
