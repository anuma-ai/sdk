# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10578](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10578)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10579](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10579)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10580](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10580)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10586](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10586)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10592](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10592)
