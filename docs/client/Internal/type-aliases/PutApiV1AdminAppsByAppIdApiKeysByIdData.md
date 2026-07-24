# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4845](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4845)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4849)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4850](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4850)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4856](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4856)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4866)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4867](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4867)
