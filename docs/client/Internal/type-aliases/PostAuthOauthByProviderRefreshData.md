# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:9574](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9574)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:9578](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9578)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9579](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9579)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:9585](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9585)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:9586](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9586)
