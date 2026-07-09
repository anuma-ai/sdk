# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10012](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10012)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10016](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10016)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10017](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10017)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10023](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10023)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10024](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10024)
