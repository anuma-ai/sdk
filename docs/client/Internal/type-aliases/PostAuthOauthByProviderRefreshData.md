# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:3666](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3666)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:3670](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3670)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3671](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3671)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:3677](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3677)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:3678](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3678)
