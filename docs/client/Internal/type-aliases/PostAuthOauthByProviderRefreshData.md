# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:3958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3958)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:3962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3962)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3963](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3963)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:3969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3969)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:3970](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3970)
