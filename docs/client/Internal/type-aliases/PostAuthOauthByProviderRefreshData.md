# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9589)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9593](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9593)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9594](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9594)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9600](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9600)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9601](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9601)
