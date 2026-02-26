# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:2533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2533)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:2537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2537)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:2538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2538)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:2544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2544)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:2545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2545)
