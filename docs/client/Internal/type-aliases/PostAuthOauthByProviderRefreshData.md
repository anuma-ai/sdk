# PostAuthOauthByProviderRefreshData

> **PostAuthOauthByProviderRefreshData** = `object`

Defined in: [src/client/types.gen.ts:3966](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3966)

## Properties

### body

> **body**: [`HandlersRefreshRequest`](HandlersRefreshRequest.md)

Defined in: [src/client/types.gen.ts:3970](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3970)

Refresh request

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:3971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3971)

**provider**

> **provider**: `string`

OAuth provider (google-drive, dropbox)

***

### query?

> `optional` **query**: `never`

Defined in: [src/client/types.gen.ts:3977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3977)

***

### url

> **url**: `"/auth/oauth/{provider}/refresh"`

Defined in: [src/client/types.gen.ts:3978](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3978)
