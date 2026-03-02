# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:3760](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3760)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:3764](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3764)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3765](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3765)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:3771](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3771)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:3772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3772)
