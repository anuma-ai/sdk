# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9822](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9822)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9826](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9826)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9827](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9827)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9833](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9833)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9834](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9834)
