# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:4815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4815)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:4819](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4819)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:4820](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4820)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4826](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4826)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4836](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4836)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:4837](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4837)
