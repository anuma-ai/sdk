# PutApiV1AdminModerationCsamByIdReviewData

> **PutApiV1AdminModerationCsamByIdReviewData** = `object`

Defined in: [src/client/types.gen.ts:6260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6260)

## Properties

### body

> **body**: [`HandlersCsamReviewRequest`](HandlersCsamReviewRequest.md)

Defined in: [src/client/types.gen.ts:6264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6264)

Review disposition and note

***

### headers

> **headers**: `object`

Defined in: [src/client/types.gen.ts:6265](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6265)

**X-Admin-API-Key**

> **X-Admin-API-Key**: `string`

Admin API key

**X-Operator?**

> `optional` **X-Operator**: `string`

Operator identity recorded as reviewer (defaults to ai-portal-admin)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:6275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6275)

**id**

> **id**: `number`

CSAM event id

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:6281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6281)

***

### url

> **url**: `"/api/v1/admin/moderation/csam/{id}/review"`

Defined in: [src/client/types.gen.ts:6282](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6282)
