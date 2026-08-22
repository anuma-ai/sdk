# PutApiV1AdminModerationCsamByIdReviewData

> **PutApiV1AdminModerationCsamByIdReviewData** = `object`

Defined in: [src/client/types.gen.ts:6000](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6000)

## Properties

### body

> **body**: [`HandlersCsamReviewRequest`](HandlersCsamReviewRequest.md)

Defined in: [src/client/types.gen.ts:6004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6004)

Review disposition and note

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:6005](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6005)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

**X-Operator?**

> `optional` **X-Operator**: `string`

Operator identity recorded as reviewer (defaults to ai-portal-admin)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:6015](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6015)

**id**

> **id**: `number`

CSAM event id

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:6021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6021)

***

### url

> **url**: `"/api/v1/admin/moderation/csam/{id}/review"`

Defined in: [src/client/types.gen.ts:6022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6022)
