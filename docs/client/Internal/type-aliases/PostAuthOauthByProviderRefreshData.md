# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10304](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10304)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10308)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10309)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10315)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10316](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10316)
