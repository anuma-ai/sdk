# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10245](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10245)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10249](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10249)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10250)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10256)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10257)
