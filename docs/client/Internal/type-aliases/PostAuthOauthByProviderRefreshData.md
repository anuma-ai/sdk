# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2691)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2695](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2695)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2696](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2696)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2702)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2703)
