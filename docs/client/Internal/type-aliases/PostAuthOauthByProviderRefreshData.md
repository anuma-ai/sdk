# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:4498](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4498)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:4502](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4502)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4503](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4503)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4509](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4509)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:4510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4510)
