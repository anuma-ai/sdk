# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:5761](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5761)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:5765](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5765)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5766)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5772)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:5773](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5773)
