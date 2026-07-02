# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9810)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9814](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9814)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9815)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9821)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9822](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9822)
