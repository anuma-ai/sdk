# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:1937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1937)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:1941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1941)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:1942](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1942)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1948](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1948)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1958)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:1959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1959)
