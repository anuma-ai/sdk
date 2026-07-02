# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4729)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4733)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4734](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4734)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4740](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4740)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4750](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4750)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4751](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4751)
