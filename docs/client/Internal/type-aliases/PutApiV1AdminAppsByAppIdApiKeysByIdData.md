# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:5241](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5241)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:5245](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5245)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:5246](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5246)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5252)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5262)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:5263](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5263)
