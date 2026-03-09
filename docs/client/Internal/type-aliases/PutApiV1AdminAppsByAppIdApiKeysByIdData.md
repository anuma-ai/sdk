# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:2116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2116)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:2120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2120)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:2121](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2121)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2127)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2137)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:2138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2138)
