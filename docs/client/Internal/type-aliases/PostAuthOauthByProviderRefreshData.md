# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:11191](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11191)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:11195](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11195)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11196](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11196)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:11202](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11202)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:11203](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11203)
