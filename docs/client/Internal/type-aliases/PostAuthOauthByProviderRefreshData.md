# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9116)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9120)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9121](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9121)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9127)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9128)
