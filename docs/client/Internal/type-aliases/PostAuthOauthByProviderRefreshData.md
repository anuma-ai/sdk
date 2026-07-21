# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10309)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10313](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10313)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10314)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10320)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10321](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10321)
