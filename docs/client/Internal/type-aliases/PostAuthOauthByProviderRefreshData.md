# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:4015](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4015)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:4019](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4019)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4020](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4020)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4026)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:4027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4027)
