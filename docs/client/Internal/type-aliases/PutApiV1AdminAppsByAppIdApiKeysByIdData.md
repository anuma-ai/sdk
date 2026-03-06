# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:2009](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2009)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:2013](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2013)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:2014](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2014)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2020](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2020)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2030)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:2031](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2031)
