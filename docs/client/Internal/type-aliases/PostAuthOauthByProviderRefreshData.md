# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9484)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9488)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9489)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9495](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9495)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9496)
