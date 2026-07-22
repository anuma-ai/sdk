# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10368](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10368)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10372)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10373](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10373)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10379](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10379)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10380)
