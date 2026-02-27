# PutApiV1AdminAppsByAppIdApiKeysByIdData

> **PutApiV1AdminAppsByAppIdApiKeysByIdData** = `object`

Defined in: [src/client/types.gen.ts:1799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1799)

## Properties

### body

> **body**: [`HandlersUpdateApiKeyRequest`](HandlersUpdateApiKeyRequest.md)

Defined in: [src/client/types.gen.ts:1803](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1803)

Update API key request

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:1804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1804)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:1810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1810)

**app\_id**

> **app\_id**: `number`

App ID

**id**

> **id**: `number`

API Key ID

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:1820](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1820)

***

### url

> **url**: `"/api/v1/admin/apps/{app_id}/api-keys/{id}"`

Defined in: [src/client/types.gen.ts:1821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1821)
