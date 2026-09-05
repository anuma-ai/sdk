# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:12132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12132)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:12136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12136)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:12137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12137)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:12143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12143)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:12144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12144)
