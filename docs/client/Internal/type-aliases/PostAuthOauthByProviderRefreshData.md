# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:4507](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4507)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:4511](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4511)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4512](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4512)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:4518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4518)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:4519](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4519)
