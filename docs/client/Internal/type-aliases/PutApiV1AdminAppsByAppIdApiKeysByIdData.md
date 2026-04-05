# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:2748](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2748)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:2752](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2752)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:2753](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2753)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2759](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2759)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2769](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2769)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:2770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2770)
