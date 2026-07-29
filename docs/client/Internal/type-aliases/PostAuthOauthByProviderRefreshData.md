# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10571)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10575)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10576](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10576)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10582](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10582)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10583)
