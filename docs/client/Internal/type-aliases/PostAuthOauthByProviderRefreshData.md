# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:4383](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4383)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:4387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4387)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4388)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4394)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:4395](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4395)
