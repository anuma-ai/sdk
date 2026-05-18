# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:6914](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6914)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:6918](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6918)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:6919](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6919)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:6925](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6925)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:6926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6926)
