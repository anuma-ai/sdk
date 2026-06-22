# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4658)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4662)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4663)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4669](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4669)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4679](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4679)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4680](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4680)
