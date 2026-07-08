# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4741](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4741)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4745)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4746)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4752](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4752)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4762)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4763](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4763)
