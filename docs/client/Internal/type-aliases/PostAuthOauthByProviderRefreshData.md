# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:11621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11621)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:11625](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11625)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11626)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:11632](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11632)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:11633](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11633)
