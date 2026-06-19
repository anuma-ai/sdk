# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9461](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9461)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9465](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9465)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9466)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9472)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9473)
