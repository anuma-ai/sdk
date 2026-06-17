# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4587](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4587)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4591](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4591)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4592](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4592)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4598](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4598)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4608](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4608)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4609](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4609)
