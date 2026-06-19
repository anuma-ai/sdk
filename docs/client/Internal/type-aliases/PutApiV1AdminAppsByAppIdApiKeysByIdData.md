# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4610)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4614](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4614)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4615](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4615)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4621)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4631](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4631)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4632](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4632)
