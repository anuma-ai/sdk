# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:3143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3143)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:3147](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3147)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:3148](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3148)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3154)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:3164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3164)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:3165](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3165)
