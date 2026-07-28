# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10464](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10464)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10468)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10469](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10469)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10475](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10475)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10476)
