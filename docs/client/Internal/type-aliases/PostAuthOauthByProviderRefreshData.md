# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:10462](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10462)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:10466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10466)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10467](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10467)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:10473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10473)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:10474](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10474)
