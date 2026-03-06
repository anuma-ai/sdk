# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:4337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4337)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:4341](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4341)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4342)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4348](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4348)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:4349](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4349)
