# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:11305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11305)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11306](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11306)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11307)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11313](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11313)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:11319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11319)
