# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:11270](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11270)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:11274](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11274)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11275)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:11281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11281)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:11282](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11282)
