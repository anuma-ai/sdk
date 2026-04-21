# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:5718](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5718)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:5722](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5722)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5723)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:5729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5729)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:5730](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5730)
