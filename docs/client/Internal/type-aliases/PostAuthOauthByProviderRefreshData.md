# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9798](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9798)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9802](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9802)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9803](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9803)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9809](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9809)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9810)
