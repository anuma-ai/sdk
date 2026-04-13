# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:2707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2707)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:2711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2711)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:2712](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2712)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2718](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2718)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2728)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:2729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2729)
